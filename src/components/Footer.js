import React from "react";
import Section from "components/Section";
import Container from "react-bootstrap/Container";
import Link from "next/link";
import "components/Footer.scss";

function Footer(props) {
  return (
    <Section
      bg={props.bg}
      textColor={props.textColor}
      size={props.size}
      bgImage={props.bgImage}
      bgImageOpacity={props.bgImageOpacity}
      className="footer"
    >
      <Container>
        <div className="FooterComponent__inner">
          <div className="social right">
            <a
              href="https://github.com/prnthh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon">
                <i className="fab  fa-github" />
              </span>
            </a>
            <a
              href="https://stackoverflow.com/users/1163562/prnth"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon">
                <i className="fab fa-stack-overflow" />
              </span>
            </a>
            <a
              href="https://www.linkedin.com/in/pranith-hengavalli-21b5834/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon">
                <i className="fab fa-linkedin" />
              </span>
            </a>
            <a
              href="https://www.instagram.com/pranithisnotaswaggot/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon">
                <i className="fab fa-instagram" />
              </span>
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
}

export default Footer;
