import React from "react";
import NavbarCustom from "./../components/NavbarCustom";
import HeroSection from "./../components/HeroSection";
import Footer from "./../components/Footer";
import {Helmet} from "react-helmet";

function IndexPage(props) {
  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <meta name="description" content="Homepage of Pranith Hengavalli, game developer, hacker and artist." />
        <title>Pranith Hengavalli Labs - Home</title>
        <link rel="canonical" href="https://prnth.com/" />
      </Helmet>
      <NavbarCustom
        bg="dark"
        variant="dark"
        expand="sm"
        logo="https://uploads.divjoy.com/logo.svg"
      />
      <HeroSection
        bg="white"
        textColor="dark"
        size="md"
        bgImage=""
        bgImageOpacity={1}
        title="prnth.com"
        subtitle="site under construction"
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

export default IndexPage;
