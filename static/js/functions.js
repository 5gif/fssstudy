import * as math from "mathjs"
import { writable, get } from "svelte/store"
import { getApp, initializeApp } from "@firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from "@firebase/auth";
import { getDatabase, ref as rtdbref, get as rtdbget, set, serverTimestamp } from "@firebase/database";
import { getStorage, getDownloadURL, ref } from "@firebase/storage";

import * as d3 from "d3";
import { Inspector } from "@observablehq/inspector";
import { update } from "@firebase/database";


// export const password = writable("");
export const currentUser = writable(null)
export const userSettings = writable(["Login First!"])
export const currentProfile = writable("default")

export const DEVELMODE = false //import.meta.env.MODE == "development"
var firebaseConfig;
var defaultApp;
// import { firebaselocalConfig, defemail, } from "./localkey.js"
const xrun = async () => {
    console.log("Loading localkey module..1")
    const { firebaselocalConfig, defemail } = await import("./localkey.js")
    console.log("Loading localkey module..2 done | ", import.meta.env.MODE, firebaselocalConfig, defemail)
    firebaseConfig = firebaselocalConfig;

    if (import.meta.env.MODE == "development") {
        firebaseConfig.apiKey = import.meta.env.VITE_API_KEY
        console.log("Setting DEVELOPMENT KEY")
    } else {
        firebaseConfig.apiKey = "AIzaSyBU0r_2MGgtMDvQYMwLlIIsvbDp5ktAQ4M"
        console.log("Setting PRODUCTION")
    }

    defaultApp = initializeApp(firebaseConfig);
}

xrun()


function toNormalForm(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


console.log("firebaseConfig", firebaseConfig)

// // Initialize Firebase
// let defaultApp = initializeApp(firebaseConfig);
// const auth = getAuth(defaultApp)

export async function SignOut() {

    const defaultApp = getApp()
    var res = signOut(getAuth(defaultApp))
    res.then(() => currentUser.set(undefined))
    return res
}

export async function SignIn(email, pwd) {
    // const defaultApp = getApp()
    const auth = getAuth()
    // pwd = pwd
    // email = email || defemail
    // console.log("Signing in with ", email, pwd)

    return auth.setPersistence(browserLocalPersistence).then(() => signInWithEmailAndPassword(auth, email, pwd).then(async user => {
        // console.log("Signin ??", "Persistence")
        currentUser.set(user);
        const db = getDatabase();
        // const dbRef = rtdbref(db, "/users/" + user.user.uid + "/");
        await update(rtdbref(db, "/users/" + user.user.uid + "/"), { lastlogged: serverTimestamp() })
        await set(rtdbref(db, "/users/" + user.user.uid + "/email"), user.user.email)
        // await set(rtdbref(db, "/users/" + user.user.uid + "/profiles"), ["africa"])

        getData("/users/" + user.user.uid + "/profiles").then(d => {
            console.log(`userSetting `, d)
            userSettings.set(d)
            currentProfile.set(d[0])
        }
        )
        // user.user.getIdTokenResult().then(
        //     d => console.log("Token ", d)
        // )

        return user
    }))

}

export async function getURL(url) {
    // console.log("App status ", app)
    url = url || "fss/hello.json"

    // const defaultApp = getApp()
    var storage = getStorage(defaultApp)
    // if (defaultApp != undefined) {
    // console.log("App storage status ", storage)
    const sref = ref(storage, url)
    return getDownloadURL(sref)
    // }

}


export async function getData(path) {
    let userdata = get(currentUser)
    if (userdata == null && !DEVELMODE) {
        console.log("not DEVELMODE not Logged In ")
        throw TypeError("unAuthorized")
    }

    console.log("RTDB getData path = ", path)
    const dbRef = rtdbref(getDatabase(), path);
    return rtdbget(dbRef).then((snapshot) => {
        if (snapshot.exists()) {
            let val = snapshot.val()
            console.log("RTDB", val);
            return val
        }

        return null
    }).catch((error) => {
        console.error("RTDB", error);
    });

}

/**
 * @param {any[]} params is array of Javascript Object
 */
export function ArrayToCSV(params) {
    // var fields;

    var fields = Object.keys(params[0])
    var csvstring = [fields, ...params.map(o => {
        var res = [];
        for (let k of fields) {
            res.push(o[k])
        }
        return res
    })].map(e => e.join(",")).join("\n")
    return csvstring

}

currentUser.subscribe(d => {
    console.log("User Changed...", d)
})
export function HelloWorld(params) {

    console.log("Sendil says ", params, math.complex(30, 54))
    return Call("AAS.Tilt", [], "99")
}
let pwd = "";

// password.subscribe(value => {
//     pwd = value;
// });

export async function Call(ObjectMethod, params, id, argpwd) {

    var currentpassword = argpwd || get(password)
    console.log("Has password ", currentpassword)
    // id = id || `${ Math.random().toFixed(3) } `
    var args = ObjectMethod.split(".")
    var rpchostname = location.hostname;
    rpchostname = "192.168.1.59"
    var endpoint;
    var baseendpoint = `http://${rpchostname}:9000/rpc/`

    // if (location.protocol == "https") {
    //     endpoint = `https://${rpchostname}:9001/rpc/` + args[0]
    // } else {
    //     endpoint = `http://${rpchostname}:9000/rpc/` + args[0]
    // }
    endpoint = baseendpoint + args[0]
    console.log("Endpoint ", endpoint)
    // endpoint = `${location.protocol}//${rpchostname}:9000/rpc/` + args[0]
    var method = args[1];
    // args.slice(1).join(".")
    var jsonobj = ({ jsonrpc: "2.0", method: method, params: params, id: id });

    // JSONrequest2

    var bodystr = JSON.stringify(jsonobj, math.replacer)
    console.log("Calling ", endpoint, method)
    // console.log(method, "BEAM ", bodystr)
    var finalresult =
        await fetch(endpoint, {
            method: "POST",
            body: bodystr,
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Authorization": currentpassword,
            }
        }).then(res => {
            if (!res.ok) {
                // get error message from body or default to response status
                console.log("Response for " + endpoint, res.statusText)
                return Promise.reject(res.status);
            }
            var txt = res.text();
            // console.log(method, " Response Txt ", txt);
            return txt
        }).then(txt => {
            var json = JSON.parse(txt, math.reviver)
            // console.log(method, "JSON ", json);
            return json.result
        })
    // console.log("Final Result ", finalresult)
    return finalresult
    // .catch(err => {
    //     console.log("Somet other error", err, err instanceof TypeError)
    //     console.log("Details of ", err.message)
    //     return ({ Error: "Network Error", meta: err })
    // }
    // )
}



function isPromise(p) {
    return p && Object.prototype.toString.call(p) === "[object Promise]";
}

export async function queueNode(id, obj, opts) {

}

export async function appendNode(id, obj, alwaysshow) {
    alwaysshow = alwaysshow || false;
    let mainel = d3.select("#" + id);
    if (mainel.empty()) {
        console.log("DOM not ready !! ", id, obj, alwaysshow);
        return
    }
    if (isPromise(obj)) {
        let el = mainel.append("div")
        el.append("hr")
        el.append("p").text(id)
        let ins = new Inspector(mainel.append("div").node());
        ins.fulfilled("waiting..." + id);
        obj.then((res) => {
            // console.log("Data for blob is ", res);

            ins.fulfilled(res);
        });
    } else {
        let el = mainel.append("div").text(id).node();
        let ins = new Inspector(el);
        ins.fulfilled(obj);
    }
};


/// EXTRA ADDING time
// let timer = new Promise((resolve) =>
    //   setTimeout(() => resolve(0), 6000)
    // ).then((d) => d);
    // gainloss = Promise.all([
    //   d3
    //     .csv("/files/common/LossesPerElevation@1.csv", d3.autoType)
    //     .then((Losses) => {
    //       var res = Losses.map((d) => ({
    //         el: +d["Elev angle"],
    //         UrbanAg: d.UrbanAg,
    //         SubUrbanAg: d.SubUrbanAg,
    //         GL: d["Gas loss"],
    //         CL: -d["Clutter gain"],
    //         PL: d["Propagation loss"],
    //       }));

    //       //  StoreFSSConfig.set({ gainloss: res });

    //       // dispatch("notify", "Values available");
    //       return res;
    //     }),
    //   timer,
    // ]).then((a) => {
    //   gainloss = a[0];
    //   return a[0];
    // });