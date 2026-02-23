import React from 'react';
import './LoadingScreen.css';
import './ItemDash.css';

const LoadingScreen = () => {
    return (
        <div className="loader-container">
            <div className="loader">
                <div className="load-inner load-one"></div>
                <div className="load-inner load-two"></div>
                <div className="load-inner load-three"></div>
                <span className="text">Loading...</span>
            </div>
        </div>
    )
}

export default LoadingScreen