import React from "react";
import Main from "./components/Main";
// import MainThreeXFive from "./components/MainThreeXFive";
import NavBar from "./components/NavBar";
import "./index.css";
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => (
  <div>
    <NavBar />
    <Main />
    {/* <MainThreeXFive /> */}
  </div>
);

export default App;