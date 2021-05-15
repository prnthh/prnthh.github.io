import React from "react";
import NavbarCustom from "./../components/NavbarCustom";
import ContentCardsSection from "./../components/ContentCardsSection";
import Footer from "./../components/Footer";
import {Helmet} from "react-helmet";

function LabsPage(props) {
  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <meta name="description" content="Posts from the labs of Pranith Hengavalli, game developer, hacker and artist." />
        <title>Pranith Hengavalli Labs</title>
        <link rel="canonical" href="https://prnth.com/" />
      </Helmet>
      <NavbarCustom
        bg="dark"
        variant="dark"
        expand="sm"
        logo="https://uploads.divjoy.com/logo.svg"
      />
      <ContentCardsSection
        bg="white"
        textColor="dark"
        size="sm"
        bgImage=""
        bgImageOpacity={1}
        title="projects from the lab"
        subtitle="Great ideas executed incompletely."
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

export default LabsPage;
