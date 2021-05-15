import React from "react";
import NavbarCustom from "./../components/NavbarCustom";
import CarouselSection from "./../components/CarouselSection";
import Footer from "./../components/Footer";
import {Helmet} from "react-helmet";

function GamesPage(props) {
  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <meta name="description" content="Games by Pranith Hengavalli, game developer, hacker and artist." />
        <title>Pranith Hengavalli Labs - Games</title>
        <link rel="canonical" href="https://prnth.com/" />
      </Helmet>
      <NavbarCustom
        bg="dark"
        variant="dark"
        expand="sm"
        logo="https://uploads.divjoy.com/logo.svg"
      />
      <CarouselSection
        items={[
          {
            image: "http://source.unsplash.com/7v_lSDRaOO0/1200x600",
            caption: "Caption for the first image",
          },
          {
            image: "http://source.unsplash.com/PvCO2IXlXBs/1200x600",
            caption: "Caption for the second image",
          },
          {
            image: "http://source.unsplash.com/KgjcndVr7tU/1200x600",
            caption: "Caption for the third image",
          },
        ]}
      />
      <Footer
        bg="dark"
        textColor="light"
        size="sm"
        bgImage=""
        bgImageOpacity={1}
        description="A short description of what you do here"
        copyright="© 2020 Company"
        logo="https://uploads.divjoy.com/logo.svg"
      />
    </>
  );
}

export default GamesPage;
