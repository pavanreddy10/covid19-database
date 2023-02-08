const express = require("express");
const app = express();
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertFunction = (dbResponse) => {
  return {
    stateId: dbResponse.state_id,
    stateName: dbResponse.state_name,
    population: dbResponse.population,
  };
};

const convertDistrict = (dbResponse) => {
  return {
    districtId: dbResponse.district_id,
    districtName: dbResponse.district_name,
    stateId: dbResponse.state_id,
    cases: dbResponse.cases,
    cured: dbResponse.cured,
    active: dbResponse.active,
    deaths: dbResponse.deaths,
  };
};
//API 1

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT 
    *
    FROM 
    state;
    `;
  const statesList = await db.all(getStatesQuery);
  response.send(statesList.map((eachState) => convertFunction(eachState)));
});

//API 2

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
    *
    FROM 
    state
    WHERE
    state_id = ${stateId};
    `;
  const state = await db.get(getStateQuery);
  response.send(convertFunction(state));
});

//API 3

app.post("/districts/", async (request, response) => {
  const districtData = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = districtData;
  const addDistrictQuery = `
  INSERT INTO
  district (district_name, state_id, cases, cured, active, deaths )
  VALUES ("${districtName}", ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});
  `;
  const district = await db.run(addDistrictQuery);
  const districtId = district.lastID;
  response.send("District Successfully Added");
});

//API 4

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT
    *
    FROM
    district
    WHERE
    district_id = ${districtId};
    `;
  const dis = await db.get(getDistrictQuery);
  response.send(convertDistrict(dis));
});

//API 5

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM
    district
    WHERE
    district_id = ${districtId};
    `;
  const deletedDistrict = await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//API 6

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const disDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = disDetails;
  const updateDistrictQuery = `
  UPDATE
  district
  SET 
  district_name = "${districtName}",
  state_id = ${stateId},
  cases = ${cases},
  cured = ${cured},
  active = ${active},
  deaths = ${deaths}
  WHERE 
  district_id = ${districtId};
  `;
  const updatedDistrict = await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

const convertStats = (dbResponse) => {
  return {
    totalCases: dbResponse.cases,
    totalCured: dbResponse.cured,
    totalActive: dbResponse.active,
    totalDeaths: dbResponse.deaths,
  };
};

//API 7

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const statsQuery = `
    SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM 
    district
    WHERE 
    state_id = ${stateId};
    `;
  const statsResponse = await db.get(statsQuery);

  //console.log(statsResponse);

  response.send({
    totalCases: statsResponse["SUM(cases)"],
    totalCured: statsResponse["SUM(cured)"],
    totalActive: statsResponse["SUM(active)"],
    totalDeaths: statsResponse["SUM(deaths)"],
  });
});

//API 8

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateQuery = `
    SELECT
    state_name AS stateName
    FROM 
    (state INNER JOIN district ON district.state_id = state.state_id)
    WHERE 
    district_id = ${districtId};
    `;
  const stateResult = await db.get(stateQuery);
  response.send(stateResult);
});

module.exports = app;
