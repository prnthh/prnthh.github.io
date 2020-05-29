import React, { useState } from 'react';
import Link from 'next/link';
import { FontResizer } from './elements';

const MainLayout = ({ children }) => {

  const [showNav, setShowNav] = useState(false);

  const onClickNavigation = () => {
    setShowNav(false);
  }

  return (<div className="main-container">

    {/* NAVIGATION SECTION  */}
    {<FontResizer small={"38px"} big={"48px"} >
      <div class="menubtn" style={showNav ? { display: "none" } : {}} onClick={() => { setShowNav(true) }}>
        ...
      </div>
    </FontResizer>
    }
    {<div id="myNav" class="overlay" style={showNav ? {} : { width: "0%" }}>
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <FontResizer small={"38px"} big={"48px"} >
          <a href="javascript:void(0)" class="closebtn" onClick={() => { setShowNav(false) }}>&times;</a>
        </FontResizer>

        <FontResizer small={"30px"} big={"38px"}>
          <div class="overlay-content">
            <Link href="/"><a onClick={() => { onClickNavigation() }}>Home</a></Link>
            <Link href="/about"><a onClick={() => { onClickNavigation() }}>About</a></Link>
            <Link href="/demo"><a onClick={() => { onClickNavigation() }}>Demos</a></Link>
          </div>
        </FontResizer>
      </div>
    </div>}

    {/* PAGE CHILDREN  */}
    <div className="content-wrapper">{children}</div>

    <style jsx global>{`
      
      
      /* The Overlay (background) */
.overlay {
  /* Height & width depends on how you want to reveal the overlay (see JS below) */    
  height: 100%;
  width: 100%;
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  right: 0;
  top: 0;
  background-color: rgb(0,0,0); /* Black fallback color */
  background-color: rgba(0,0,0, 0.9); /* Black w/opacity */
  overflow-x: hidden; /* Disable horizontal scroll */
  transition: 0.5s; /* 0.5 second transition effect to slide in or slide down the overlay (height or width, depending on reveal) */
}

/* Position the content inside the overlay */
.overlay-content {
  position: relative;
  width: 100%; /* 100% width */
  text-align: center; /* Centered text/links */
}

/* The navigation links inside the overlay */
.overlay a {
  padding: 15px;
  text-decoration: none;
  font-weight: 200;
  color: #818181;
  display: block; /* Display block instead of inline */
  transition: 0.3s; /* Transition effects on hover (color) */
}

/* When you mouse over the navigation links, change their color */
.overlay a:hover, .overlay a:focus {
  color: #f1f1f1;
}

/* Position the close button (top right corner) */
.overlay .closebtn {
  position: absolute;
  top: 20px;
  right: 25px;
}

.menubtn {
  position: fixed;
  top: 20px;
  right: 25px;
  border-radius: 20px;
  padding:12px;
  background-color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
}

/* When the height of the screen is less than 450 pixels, change the font-size of the links and position the close button again, so they don't overlap */
@media screen and (max-height: 450px) {
  .overlay a {font-size: 20px}
  .overlay .closebtn {
    font-size: 40px;
    top: 15px;
    right: 35px;
  }
}
    `}</style>
    <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
        }
        h1,h2,h3 {
          margin-top: 0px;
          margin-bottom: 0px;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
  </div>)
};

export default MainLayout;