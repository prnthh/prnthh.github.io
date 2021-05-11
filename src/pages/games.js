import React from "react";
import NavbarCustom from "./../components/NavbarCustom";
import CarouselSection from "./../components/CarouselSection";
import Footer from "./../components/Footer";

function GamesPage(props) {
  return (
    <>
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
