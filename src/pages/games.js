import React from "react";
import CarouselSection from "./../components/CarouselSection";

function GamesPage(props) {
  return (
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
  );
}

export default GamesPage;
