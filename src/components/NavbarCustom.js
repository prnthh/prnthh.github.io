import React from "react";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Link from "next/link";
import Nav from "react-bootstrap/Nav";
import NavDropdown from "react-bootstrap/NavDropdown";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";
import { useAuth } from "util/auth.js";

function NavbarCustom(props) {
  const auth = useAuth();

  return (
    <Navbar bg={props.bg} variant={props.variant} expand={props.expand}>
      <Container>
        <Link href="/" passHref={true}>
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
        </Link>

        <Navbar.Toggle aria-controls="navbar-nav" className="border-0" />
        <Navbar.Collapse id="navbar-nav" className="justify-content-end">
          <Nav className="mr-1">
            <Link href="/" passHref={true}>
              <Nav.Link active={false}>Home</Nav.Link>
            </Link>

            <Link href="/labs" passHref={true}>
              <Nav.Link active={false}>Labs</Nav.Link>
            </Link>

            <Link href="/books/hhgtc/index.html" passHref={true}>
              <Nav.Link active={false}>Books</Nav.Link>
            </Link>

            <Link href="/games" passHref={true}>
              <Nav.Link active={false}>Games</Nav.Link>
            </Link>
            {/* {!auth.user && (
              <Link href="/auth/signin" passHref={true}>
                <Nav.Link active={false}>Sign in</Nav.Link>
              </Link>
            )}

            {auth.user && (
              <NavDropdown id="dropdown" title="Account" alignRight={true}>
                <Link href="/dashboard" passHref={true}>
                  <NavDropdown.Item active={false}>Dashboard</NavDropdown.Item>
                </Link>

                <Link href="/settings/general" passHref={true}>
                  <NavDropdown.Item active={false}>Settings</NavDropdown.Item>
                </Link>

                <Dropdown.Divider />

                <Link href="/auth/signout" passHref={true}>
                  <NavDropdown.Item
                    active={false}
                    onClick={(e) => {
                      e.preventDefault();
                      auth.signout();
                    }}
                  >
                    Sign out
                  </NavDropdown.Item>
                </Link>
              </NavDropdown>
            )} */}
          </Nav>

          {/* {!auth.user && (
            <Link href="/auth/signup" passHref={true}>
              <Button variant="primary">Sign Up</Button>
            </Link>
          )} */}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavbarCustom;
