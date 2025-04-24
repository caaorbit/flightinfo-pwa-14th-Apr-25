// 1. Import React, Hooks, and openDB for IndexedDB
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { openDB } from 'idb';

const RequestForm = lazy(() => import('./RequestForm'));

function App() {
  // 2. State management
  const [flights, setFlights] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [name, setName] = useState('');
  const [flightNo, setFlightNo] = useState('');

  // 3. Initialize AeroDB (favorites + requests)
  const dbPromise = openDB('AeroDB', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'flightNumber' });
      }
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'timestamp' });
      }
    }
  });

  // 4. Load favorites and fetch flights
  useEffect(() => {
    const loadFavorites = async () => {
      const db = await dbPromise;
      const allFavs = await db.getAll('favorites');
      setFavorites(allFavs);
    };

    const fetchFlights = async () => {
      try {
        const response = await fetch('https://api.aviationstack.com/v1/flights?access_key=6c5bfda9b4d1b014b29426ca5e587858');
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        const firstTen = data.data.slice(0, 10);
        setFlights(firstTen);
      } catch (err) {
        console.error('Error fetching flight data:', err);
        setError(err.message);
      }
    };

    loadFavorites();

    if (isOnline) {
      fetchFlights();
    } else {
      setFlights([]);
    }
  }, [isOnline]);

  // 5. Handle PWA Install prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('PWA setup accepted');
    } else {
      console.log('PWA setup dismissed');
    }
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  // 6. Listen to online/offline
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // 7. Favorite or Unfavorite a flight
  const handleFavorite = async (flight) => {
    const db = await dbPromise;
    const flightNumber = flight.flight?.iata || flight.flightNumber;

    const isFav = favorites.some(f => f.flightNumber === flightNumber);

    if (isFav) {
      await db.delete('favorites', flightNumber);
    } else {
      await db.put('favorites', {
        flightNumber: flightNumber,
        airline: flight.airline?.name,
        departure: flight.departure?.airport || flight.departure,
        arrival: flight.arrival?.airport || flight.arrival,
        status: flight.flight_status
      });
    }

    const allFavs = await db.getAll('favorites');
    setFavorites(allFavs);
  };

  const isFavorite = (flightNumber) => favorites.some(f => f.flightNumber === flightNumber);

  // 8. Handle submitting flight info request
  const handleSubmit = async (e) => {
    e.preventDefault();

    const requestData = {
      name,
      flightNumber: flightNo,
      timestamp: Date.now()
    };

    if (navigator.onLine) {
      await sendToServer(requestData);
      alert('Request sent!');
    } else {
      const db = await dbPromise;
      await db.add('requests', requestData);

      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const sw = await navigator.serviceWorker.ready;
        await sw.sync.register('sync-requests');
        alert('Request saved! Will sync when back online.');
      } else {
        alert('Background Sync not supported.');
      }
    }

    setName('');
    setFlightNo('');
  };

  const sendToServer = async (data) => {
    console.log('Sending to server:', data);
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  // 9. Show flights (online: API / offline: favorites)
  const flightsToShow = isOnline
    ? flights
    : favorites.map(fav => ({
      airline: { name: fav.airline },
      flight: { iata: fav.flightNumber },
      departure: { airport: fav.departure },
      arrival: { airport: fav.arrival },
      flight_status: fav.status
    }));

  // 10. Show error
  if (error) {
    return <div>Error fetching flight data: {error}</div>;
  }

  const showNotification = async () => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const sw = await navigator.serviceWorker.ready;
        sw.showNotification('Flight Update!', {
          body: 'You have a new flight notification!',
          icon: '/logo192.png'
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const sw = await navigator.serviceWorker.ready;
          sw.showNotification('Flight Update!', {
            body: 'You have a new flight notification!',
            icon: '/logo192.png'
          });
        }
      }
    }
  };

  // 11. Render UI
  return (
    <div>
      <h1>Flight Schedule</h1>

      <button onClick={showNotification} style={{ marginBottom: '20px' }}>
        Show Notification
      </button>



      {showInstallButton && (
        <button onClick={handleInstall} style={{ marginBottom: '20px' }}>
          Install App
        </button>
      )}

      {!isOnline && (
        <p style={{ color: 'red' }}>You are offline - showing saved favorites.</p>
      )}

      <h2>Request Flight Info</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Flight Number"
          value={flightNo}
          onChange={(e) => setFlightNo(e.target.value)}
          required
        />
        <button type="submit">Submit Request</button>
      </form>

      <Suspense fallback={<p>Loading form...</p>}>
        <RequestForm
          name={name}
          setName={setName}
          flightNo={flightNo}
          setFlightNo={setFlightNo}
          handleSubmit={handleSubmit}
        />
      </Suspense>

      {flightsToShow.length === 0 ? (
        <p>Loading flight data...</p>
      ) : (
        <ul>
          {flightsToShow.map((flight, index) => (
            <li key={flight.flight.iata || index}>
              <strong>{flight.airline?.name || 'Unknown Airline'}</strong> – Flight {flight.flight?.iata || 'N/A'}
              <br />
              Departs: {flight.departure?.airport || 'Unknown Airport'}{flight.departure?.scheduled ? ` at ${new Date(flight.departure.scheduled).toLocaleTimeString()}` : " at N/A time"}
              <br />
              Arrives: {flight.arrival?.airport || 'Unknown Airport'}
              <br />
              Status: {flight.flight_status || 'N/A'}
              <br />
              {isOnline && (
                <button onClick={() => handleFavorite(flight)}>
                  {isFavorite(flight.flight?.iata || flight.flightNumber) ? '★ Favorited' : '☆ Favorite'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;