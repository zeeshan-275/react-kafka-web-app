import React from "react";

const NavBar = () => (
    <nav>
        <div className="nav_logo">
            <img src="/img/giventures-logo.png" alt="Giventures Logo" />
            <div id="disclaimer">Your name will not be displayed if your dataset has not been created</div>
            <img src="/img/abesit-logo.png" alt="Abesit Logo" />
        </div>
        <div className="navlower">
            <img src="/img/camera-logo.png" alt="Camera Logo" />
            <div>PLEASE LOOK INTO THE CAMERA</div>
            <img src="/img/camera-logo.png" alt="Camera Logo" />
        </div>
    </nav>
);

export default NavBar;
