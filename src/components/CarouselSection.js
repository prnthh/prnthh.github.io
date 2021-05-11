import React from "react";
import Carousel from "react-bootstrap/Carousel";

function CarouselSection(props) {
  return (
    <Carousel>
      {props.items.map((item, index) => (
        <Carousel.Item key={index}>
          <img className="d-block w-100" src={item.image} alt={item.caption} />
          <Carousel.Caption>
            <p>{item.caption}</p>
          </Carousel.Caption>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}

export default CarouselSection;
