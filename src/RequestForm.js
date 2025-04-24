import React from 'react';

const RequestForm = ({ name, setName, flightNo, setFlightNo, handleSubmit }) => (
    <>
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
    </>
);

export default RequestForm;