import React from "react";
import "./../styles/global.scss";
import IndexPage from "./index";
import LabsPage from "./labs";
import GamesPage from "./games";
import { Switch, Route, Router } from "./../util/router.js";
import NotFoundPage from "./not-found.js";
import "./../util/analytics.js";

function App(props) {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={IndexPage} />

        <Route exact path="/labs" component={LabsPage} />

        <Route exact path="/games" component={GamesPage} />

        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
}

export default App;
