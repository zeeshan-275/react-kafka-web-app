import React from "react";

const NavBar = () => (
    <nav>
        <div className="d-flex align-items-start justify-content-between">
            <img src="/img/giventures-logo.png" alt="Giventures Logo" />
            <div className="nav-disclaimer d-flex col-8 justify-content-around align-items-center">
                <img src="/img/camera-logo.png" alt="Camera Logo" />
                <div className="d-flex flex-column text-center text-warning">
                    <span className="disc">PLEASE LOOK INTO THE CAMERA</span>
                    <p className="fs -4">Your name will not be displayed if your dataset has not been created</p>
                </div>
                <img src="/img/camera-logo.png" alt="Camera Logo" />
            </div>
            <img src="/img/abesit-logo.png" alt="Abesit Logo" />
        </div>
    </nav>
);

export default NavBar;
