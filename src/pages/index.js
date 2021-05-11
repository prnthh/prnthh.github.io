import React from "react";
import NavbarCustom from "./../components/NavbarCustom";
import HeroSection from "./../components/HeroSection";
import Footer from "./../components/Footer";

function IndexPage(props) {
  return (
    <>
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
