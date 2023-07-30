// import * as turf from "@turf/turf";
// import * as d3 from "d3";
import { turf, d3 } from "./workaround.js";

console.log("WEB WORKER..init()")
let ready = false
let idb;

// function start() {
// console.log("indexdb load");
// let vers = localStorage.getItem("version");
// if (vers == undefined) {
//     vers = 1;
// } else {
//     vers = parseFloat(vers);
//     vers = vers + 0.1;
// }


console.log("WEB WORKER I am called")
// }

var i = 0;
var totalLength = 5
function startTimer() {

    if (i <= totalLength) {
        postMessage({ type: "status", command: "startTimer", statusType: "progressbar", val: i, count: totalLength })
        // postMessage({ status: i, count: totalLength, name: "Timer" })

        setTimeout(startTimer, 1000);
        i = i + 1;
    }

}
async function generateGridGlobal(args) {
    let EdgeMode = false;
    console.log("webworker args", typeof args, Array.isArray(args))
    let countryNames;
    if (Array.isArray(args)) {
        countryNames = args
    } else {
        countryNames = args.countries
        EdgeMode = args.EdgeMode
    }

    let mygrid = undefined

    return getCountries(countryNames).then(r => {
        console.log("List of countries...", r)
        let mergedworlds = r;
        postMessage({ type: "status", command: "updateGrid", statusType: "started", value: totalLength })

        // postMessage({ msg: `Found ${mergedworlds.length} Countries` })
        let result = [];
        // let IMTgridCountrySelected;  
        let indx = 0;
        let cnt = 0;
        let COUNT = 0
        {
            let nonIMTCountries = turf.featureCollection(mergedworlds.filter(f => !f.properties.hasIMTgrid))
            if (nonIMTCountries.features.length > 0) {
                //   IMTgridCountrySelected = false;
                let gridBoundary = turf.bbox(nonIMTCountries);
                let biggrid = turf.squareGrid(gridBoundary, 1, {
                    units: "degrees",
                });
                // console.log("big grid", biggrid);
                if (biggrid.features.length == 0) {
                    return "SELECTED country is smaller than GRID ??";
                }
                cnt = 0
                let cname;
                // console.log("TOTAL squaregrids ", biggrid.features.length);
                COUNT = biggrid.features.length
                biggrid.features.forEach((f) => {
                    // postMessage({ name: "Grid Analysis " + cname, status: indx, count: COUNT })

                    // console.log("updateGrid() stage 2.. solving ",c.properties.NAMEen,indx,  )
                    let pt = [];
                    // pt = turf.centroid(f).geometry.coordinates;
                    pt = turf.centerOfMass(f).geometry.coordinates;
                    f.properties.center = pt;

                    // /// ITERATE Over all selected Country
                    f.properties.Country = "";
                    f.properties.inLand = false;
                    nonIMTCountries.features.filter((c) => {
                        var found;
                        if (EdgeMode) {
                            found = turf.booleanIntersects(c, f); //  NOTE this is over estimate
                        } else {
                            found = d3.geoContains(c, pt); // USE THIS
                        }

                        if (found) {
                            f.properties.inLand = found;
                            // f.properties.inLand = true;
                            f.properties.Country = c.properties.NAMEen;
                            cname = f.properties.Country;
                        }
                        return found;
                    });

                    // console.log("Found in country ", f.properties.Country);
                    f.properties.RaRb = true;
                    f.properties.Active = f.properties.inLand;
                    f.properties.ActiveFactor = f.properties.inLand ? 1 : 0;
                    f.properties.id = indx;
                    indx++;
                    cnt++

                    postMessage({ type: "status", command: "updateGrid", statusType: "progressbar", meta: cname, val: cnt, count: COUNT })
                });
                result.push(...biggrid.features);
                // postMessage({ type: "status", command: "updateGrid", statusType: "completed" })
                mygrid = turf.featureCollection(result);
                postMessage({ type: "command", command: "updateGrid", statusType: "completed", meta: cname, result: mygrid })

            }
        }
        // cnt = 0
        let IMTCountries = mergedworlds.filter(f => f.properties.hasIMTgrid)
        console.log("Now processing IMT countries ", IMTCountries)
        // let cname="";
        if (IMTCountries.length > 0) {
            let cname
            IMTCountries.forEach(C => {
                cname = C.properties.NAMEen
                // progress.update((n) => 0);
                // console.log("updateGrid() : updating status ", cname, $progress);
                postMessage({ type: "status", command: "updateGrid", statusType: "running", value: cname })
                console.log("updateGrid() stage 3");
                COUNT = COUNT + C.properties.IMTgrid.features.length
                C.properties.IMTgrid.features.forEach((f) => {
                    f.properties.inLand = true;
                    f.properties.Country = cname;
                    let pt = turf.centerOfMass(f).geometry.coordinates;

                    f.properties.center = pt;
                    f.properties.RaRb = false;
                    // /// ITERATE Over all selected Country
                    f.properties.inLand = true;
                    f.properties.Country = cname;
                    f.properties.Active = true;
                    f.properties.ActiveFactor = 1;
                    f.properties.id = indx;

                    result.push(f);

                    indx++;
                    cnt++
                    postMessage({ type: "status", command: "updateGrid", statusType: "progressbar", meta: cname, val: cnt, count: COUNT })
                });
            })

            // DO RENUMBERING
            // if (mygrid == undefined) {
            console.log("updateGrid() stage 4a");
            mygrid = turf.featureCollection(result);
            postMessage({ type: "command", command: "updateGrid", statusType: "completed", meta: cname, result: mygrid })

        }

    })

}


async function generateGrid(args) {
    let EdgeMode = false;
    console.log("webworker args", typeof args, Array.isArray(args))
    let countryNames;
    if (Array.isArray(args)) {
        countryNames = args
    } else {
        countryNames = args.countries
        EdgeMode = args.EdgeMode
    }

    let mygrid = undefined
    return getCountries(countryNames).then(r => {
        console.log("List of countries...", r)
        let mergedworlds = r;
        postMessage({ type: "status", command: "updateGrid", statusType: "started", value: totalLength })

        // postMessage({ msg: `Found ${mergedworlds.length} Countries` })
        let result = [];
        // let IMTgridCountrySelected;  
        let indx = 0;
        let cnt = 0;
        countryNames.forEach(cname => {

            if (mergedworlds == undefined || cname == "") {
                // throw TypeError("Empty MAP");
                console.error("I am going back !!");
                return [];
            }
            // progress.update((n) => 0);
            // console.log("updateGrid() : updating status ", cname, $progress);
            postMessage({ type: "status", command: "updateGrid", statusType: "running", value: cname })
            //  gridProcessing = true;
            // d3.select("#status").text("updateGrid() started..");
            // let IMTgridCountrySelected;
            let c = mergedworlds.filter(
                (f) => f.properties.NAMEen == cname
            )[0];


            // add new country

            // JUST append the COUNTRY to existing mygrid



            console.log("updateGrid() stage 2 ", cname, c);
            if (c.properties.hasIMTgrid) {
                //  IMTgridCountrySelected = true;
                console.log("updateGrid() stage 3");
                let COUNT = c.properties.IMTgrid.features.length
                c.properties.IMTgrid.features.forEach((f) => {
                    f.properties.inLand = true;
                    f.properties.Country = c.properties.NAMEen;

                    let pt = turf.centerOfMass(f).geometry.coordinates;

                    f.properties.center = pt;
                    f.properties.RaRb = false;
                    // /// ITERATE Over all selected Country
                    f.properties.inLand = true;
                    f.properties.Country = c.properties.NAMEen;
                    f.properties.Active = true;
                    f.properties.ActiveFactor = 1;
                    f.properties.id = indx;

                    result.push(f);

                    // progress.update((n) => {
                    //   console.log("Updating ", n);
                    //   return n + 1;
                    // });

                    indx++;
                    cnt++
                    postMessage({ type: "status", command: "updateGrid", statusType: "progressbar", meta: cname, val: cnt, count: COUNT })
                });
            } else {
                //   IMTgridCountrySelected = false;
                let gridBoundary = turf.bbox(c);
                let biggrid = turf.squareGrid(gridBoundary, 1, {
                    units: "degrees",
                });
                // console.log("big grid", biggrid);
                if (biggrid.features.length == 0) {
                    return "SELECTED country is smaller than GRID ??";
                }
                cnt = 0
                // console.log("TOTAL squaregrids ", biggrid.features.length);
                let COUNT = biggrid.features.length
                biggrid.features.forEach((f) => {
                    // postMessage({ name: "Grid Analysis " + cname, status: indx, count: COUNT })

                    // console.log("updateGrid() stage 2.. solving ",c.properties.NAMEen,indx,  )
                    let pt = [];
                    // pt = turf.centroid(f).geometry.coordinates;
                    pt = turf.centerOfMass(f).geometry.coordinates;
                    f.properties.center = pt;
                    let found = false;
                    if (EdgeMode) {
                        found = turf.booleanIntersects(c, f); //  NOTE this is over estimate
                    } else {
                        found = d3.geoContains(c, pt); // USE THIS
                    }
                    f.properties.RaRb = true;
                    f.properties.Active = found;
                    f.properties.ActiveFactor = found ? 1 : 0;
                    f.properties.id = indx;
                    f.properties.inLand = found;
                    f.properties.Country = c.properties.NAMEen;
                    // console.log("Adding COUNTER", COUNTER);

                    // progress.update((n) => {
                    //   console.log("Updating ", n);
                    //   return n + 1;
                    // });
                    indx++;
                    cnt++
                    postMessage({ type: "status", command: "updateGrid", statusType: "progressbar", meta: cname, val: cnt, count: COUNT })
                });
                result.push(...biggrid.features);
                // postMessage({ type: "status", command: "updateGrid", statusType: "completed" })
            }
            // DO RENUMBERING
            // if (mygrid == undefined) {
            console.log("updateGrid() stage 4a");
            mygrid = turf.featureCollection(result);
            postMessage({ type: "command", command: "updateGrid", statusType: "completed", meta: cname, result: mygrid })

        })

    }

    )


}

async function getRecord(key) {
    return new Promise((resolve, reject) => {
        let globalmapStore = idb.result.transaction("globalmap", "readonly").objectStore("globalmap")
        let req = globalmapStore.get(key)
        req.onsuccess = (r) => {
            if (r.target.result !== undefined) {
                console.log("getCountries() WEB WORKER getRecord", key, r.target.result);
                resolve(r.target.result)
            } else {
                resolve(`getCountries() mapinformation EMPTY/Error`)
            }
        }
        req.onerror = (e) => {
            console.log("getCountries() WEB WORKER getRecord Error");
            reject(e)
        }

    })
}

async function getCountries(names) {
    names = names || []
    // indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;
    console.log("WEB WORKDER : getCountries..")
    return new Promise((resolve, reject) => {
        idb = indexedDB.open("mapinformation", 1);
        idb.onsuccess = async () => {

            // console.log("WEB WORKER indexdb success");
            let globalmapStore = idb.result.transaction("globalmap", "readonly").objectStore("globalmap")

            if (names.length == 0) {
                console.log("getCountries() Will READ ALL to indexdb",);
                let req = globalmapStore.getAll()
                req.onsuccess = (r) => {
                    if (r.target.result !== undefined) {
                        console.log("getCountries() WEB WORKER getAll", r.target.result);
                        resolve(r.target.result)
                    } else {
                        resolve(`getCountries() mapinformation EMPTY/Error`)
                    }
                }
                req.onerror = (e) => {
                    console.log("getCountries() WEB WORKER getAll Error");
                    reject(e)
                }
            } else {
                console.log("getCountries() Will READ ", names);

                let myresult = names.map(async f => await getRecord(f))
                // names.forEach(async f => {
                //     let temp = await getRecord(f)
                //     console.log("Found.. ", f, temp)
                //     result.push(temp)
                // })
                console.log("Found myresults ", myresult)
                let results = await Promise.all(myresult)
                console.log("Found results ", results)
                resolve(results)
            }


            //     const objectStore = db.transaction("customers").objectStore("customers");
            // let countreq = globalmapStore.count()
            // countreq.onsuccess = () => {
            //     let total = countreq.result
            //     postMessage({ count: total })

            //     let indx = 0;
            //     globalmapStore.openCursor().onsuccess = (event) => {
            //         const cursor = event.target.result;
            //         if (cursor) {
            //             let feature = cursor.value
            //             let area = 0;
            //             // let area = Math.round(turf.area(feature) / 1e6)
            //             console.log(`WORKDER : Key  ${cursor.key} is ${area}sqkm`);
            //             postMessage({ status: indx, count: total, name: "Records globalmap", area })

            //             indx++
            //             cursor.continue();
            //         } else {
            //             console.log("No more entries!");
            //         }
            //     };
            // }
        };


    })

}

let version = 1
// const version = "v1.0"
onmessage = async (ev) => {

    console.log('WEB WORKER: Received Hello World 👋', ev.data);
    let msg = ev.data
    msg.command = msg.command || ""
    switch (msg.command) {
        case "init":
            version = msg.version || 1
            idb = indexedDB.open("mapinformation", version);
        case "timer":
            i = 0
            console.log("Starting timer... ")
            totalLength = 5
            startTimer()
            break
        case "list":
            // start()
            getCountries().then(f => {
                postMessage({ msg: "Got Countries", data: f.length, name: "getCountries" })
            })
            // else {
            //     postMessage("WEB WORKER: NOT READY yet")
            // }
            break
        case "updateGrid":
            // generateGrid(msg.data)
            generateGridGlobal(msg.data)
            break
        default:
            console.log("WEB WORKER: No specific command ")
    }


};


// timedCount();

// export { version };