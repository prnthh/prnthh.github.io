import React, {useState} from "react";
import Section from "components/Section";
import Container from "react-bootstrap/Container";
import SectionHeader from "components/SectionHeader";
import Link from "next/link";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Modal from "react-bootstrap/Modal"
import Button from "react-bootstrap/Button"
import AspectRatio from "./AspectRatio";
import items from "./../content/labs";

function ContentCardsSection(props) {

  const [openedPost, setOpenedPost] = useState(null);

  return (
    <Section
      bg={props.bg}
      textColor={props.textColor}
      size={props.size}
      bgImage={props.bgImage}
      bgImageOpacity={props.bgImageOpacity}
    >
      <Container>
      <SectionHeader
          title={props.title}
          subtitle={props.subtitle}
          size={2}
          spaced={true}
          className="text-center"
        />
        <Row className="justify-content-center">
          {items.map((item, index) => (
            <Col xs={12} md={6} lg={3} className="py-3" key={index}>
              {/* <LinkContainer to={item.url}> */}
                <Link href={`/labs/${encodeURIComponent(item.url)}`}><Card as="a" text="dark" className="text-decoration-none"
                  style={{cursor: "pointer"}}
                  // onClick={()=>{
                  //   setOpenedPost(item);
                  // }}
                  >
                  <AspectRatio ratio={1 / 0.5}>
                    <Card.Img src={item.image ? item.image : "/assets/shebg.png"} alt={item.title} variant="top" />
                  </AspectRatio>
                  <Card.Body>
                    <Card.Title>{item.title}</Card.Title>
                    <Card.Text>
                      {/* {item.body.split(" ").slice(0, 15).join(" ")} */}
                      <div style={{textAlign: 'right', fontSize: '0.8em', color: 'grey'}}> {Math.max(1, Math.floor(item.body.split(" ").length / 60))} minute read</div>
                    </Card.Text>
                  </Card.Body>
                </Card></Link>
              {/* </LinkContainer> */}
            </Col>
          ))}
        </Row>

        <Modal
          show={(openedPost != null)}
          onHide={() => setOpenedPost(null)}
          size="lg"
          aria-labelledby="contained-modal-title-vcenter"
          centered
        >
          {openedPost && <>
          <Modal.Header closeButton>
            <Modal.Title id="contained-modal-title-vcenter">
              {openedPost && openedPost.title}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
                  {openedPost && openedPost.image && 
                    <center>
                      <Card.Img style={{maxHeight: "10rem", width: 'auto'}} src={openedPost.image} alt={openedPost.title} variant="top" />
                    </center>
                  }
            <p>
              {openedPost && mapStringToP(openedPost.body)}
            </p>
          </Modal.Body>
          {openedPost.buttons && 
            <Modal.Footer>
              {openedPost.buttons.map((button) => {
                return <a
                href={button.url}
                target="_blank"
                rel="noopener noreferrer"
                ><Button onClick={()=>{}}>
                  {button.label ? button.label : "Link"}
                </Button></a>
              })}
            </Modal.Footer>
          }
          </>}
        </Modal>
      </Container>
    </Section>
  );
}

export default ContentCardsSection;
