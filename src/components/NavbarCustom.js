import React from "react";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import { LinkContainer } from "react-router-bootstrap";
import Nav from "react-bootstrap/Nav";
import { useAuth } from "./../util/auth.js";

function NavbarCustom(props) {
  const auth = useAuth();

  return (
    <Navbar bg={props.bg} variant={props.variant} expand={props.expand}>
      <Container>
        <LinkContainer to="/">
          <Navbar.Brand>
            {/* <img
              className="d-inline-block align-top"
              src={props.logo}
              alt="Logo"
              height="30"
            /> */}
            <div>
            <pre style={{fontSize: 7, color: "white", fontWeight: "bold", margin: "-16px 0px"}}>{`
                        _   _     
       _ __  _ __ _ __ | |_| |__  
 /\\/| | '_ \\| '__| '_ \\| __| '_ \\ 
|/\\/  | |_) | |  | | | | |_| | | |
      | .__/|_|  |_| |_|\\__|_| |_|
      |_|
            `}</pre>
            </div>
          </Navbar.Brand>
        </LinkContainer>

        <Navbar.Toggle aria-controls="navbar-nav" className="border-0" />
        <Navbar.Collapse id="navbar-nav" className="justify-content-end">
          <Nav className="mr-1">
            <LinkContainer to="/">
              <Nav.Link active={false}>Home</Nav.Link>
            </LinkContainer>

            <LinkContainer to="/labs">
              <Nav.Link active={false}>Labs</Nav.Link>
            </LinkContainer>

            <LinkContainer to="/games">
              <Nav.Link active={false}>Games</Nav.Link>
            </LinkContainer>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavbarCustom;
