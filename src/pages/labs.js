import React from "react";
import NavbarCustom from "./../components/NavbarCustom";
import ContentCardsSection from "./../components/ContentCardsSection";
import Footer from "./../components/Footer";

function LabsPage(props) {
  return (
    <>
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
