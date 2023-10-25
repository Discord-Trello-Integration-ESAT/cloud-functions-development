import React, { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth, db } from "./firebase/firebase";
import { collection, doc, setDoc, getDoc, getDocs } from "firebase/firestore";

const App = () => {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uniqueCode, setUniqueCode] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [emailFromAuth, setEmailFromAuth] = useState(null);
  const [isCheckVerificationCalled, setIsCheckVerificationCalled] = useState(false);
  const [tokenToPOST, setTokenToPOST] = useState(null);
  const [tokenInURL, setTokenInURL] = useState(null);
  const [trelloResponse, setTrelloResponse] = useState(null);

  console.log("emailFromAuth", emailFromAuth);

  //console.log("DB:", db);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    if (token) {
      setTokenToPOST(token);
      setTokenInURL(token); // Store token state
      console.log("Token:", token);
    }

    const savedEmail = sessionStorage.getItem("emailFromAuth");

    if (savedEmail) {
      setEmailFromAuth(savedEmail);
    }

  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const email = user.email;

      setEmailFromAuth(email);

      // Save to session storage
      sessionStorage.setItem("emailFromAuth", email);

      // Firestore operations
      const docRef = doc(db, "estudiantesMappings", email);

      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Generate a unique code if the document doesn't exist
        const uniqueCode = Math.random().toString(36).substr(2, 8);

        setUniqueCode(uniqueCode);

        // Create a new document with the unique code
        await setDoc(docRef, {
          discordUserID: null,
          trelloUsername: null,
          uniqueCode: uniqueCode, // Storing the unique code
        });
      }

      console.log("Success:", user);

      setIsAuthenticated(true);
    } catch (error) {
      // Handle errors
      console.log("Error:", error);
    }
  };

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log("Signed out");
      })
      .catch((error) => {
        console.log("Error signing out:", error);
      });
  };

  const checkVerification = async () => {
    setIsCheckVerificationCalled(true); // Set it to true once function is called

    if (!emailFromAuth) {
      console.log("User not authenticated");
      return;
    }

    try {
      const docRef = doc(db, 'estudiantesMappings', emailFromAuth);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data && data.discordUserID !== null) {
          setIsVerified(true);
        } else {
          setIsVerified(false);
        }
      } else {
        setIsVerified(false);
      }
    } catch (error) {
      console.error("Error checking verification: ", error);
      setIsVerified(false);
    }
  };

  const linkTrelloAccount = async () => {

/*     const TRELLO_CLIENT_ID = '70158910c469bee6a6091cee35786b57';
    const REDIRECT_URI = 'http://localhost:3000/'; */

    const apiKey = "70158910c469bee6a6091cee35786b57";
    const appName = "Authparausuarios";
    const returnUrl = "http://localhost:3000/";
    const scope = "read,write";
    const expiration = "30days";

    const authUrl = `https://trello.com/1/authorize?expiration=${expiration}&name=${appName}&scope=${scope}&response_type=token&key=${apiKey}&return_url=${returnUrl}&callback_method=fragment`;

    // Redirect the user
    window.location.href = authUrl;
    
/*     const trelloOAuthUrl = `https://trello.com/1/OAuthAuthorizeToken?oauth_token=${TRELLO_CLIENT_ID}&return_url=${encodeURIComponent(REDIRECT_URI)}`;
    
    window.location.href = trelloOAuthUrl; */
    
    // Step 2: Call the Cloud Function to link the account
    const authorizationCode = "your_authorization_code_from_oauth"; // Replace this
    const email = emailFromAuth; // Your user's Gmail address
  
/*     const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, email })
    }; */
  
/*     const response = await fetch('your_cloud_function_url_here', requestOptions);
    
    if (response.ok) {
      // Do something on success
    } else {
      // Handle error
    } */
  };

  function reloadWithoutParams() {
    // Get the current URL without the query parameters
    const currentURLWithoutParams = window.location.origin + window.location.pathname;
  
    // Navigate to the modified URL
    window.location.href = currentURLWithoutParams;
  
    // Reload the page
    window.location.reload();
  }


  const postToTrelloCloudFunction = () => {
    // Construct the URL with email and apiToken as query parameters
    const url = `https://us-central1-esat-alpha-26c1b.cloudfunctions.net/linkTrelloAccount?email=${emailFromAuth}&token=${tokenToPOST}`;
    
    // Call the cloud function
    fetch(url, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
    })
    .then(response => response.json())
    .then(data => {

      if (data && data[0].memberType === "normal") {

        console.log("Success linking Trello account");

        setTrelloResponse("success");

      } else if (data && data[0].memberType === "ghost") {


        console.log("User doesnt have Trello account");

        setTrelloResponse("notTrelloUser");

      } else{

        console.log("Cloud function response:", data);
        setTrelloResponse("undefined");

      }
  
    })
    .catch(error => {
      console.error("Error calling cloud function:", error);
    });
  };
  

  return (
    <div className="p-4">
      {(!isAuthenticated && !tokenInURL) ? (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <button
            onClick={handleGoogleSignIn}
            className="bg-blue-500 text-white p-4 rounded"
          >
            Iniciar sesión
          </button>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white p-4 rounded ml-4"
          >
            Salir
          </button>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col gap-3 items-center justify-center bg-gray-50">
          <h1 className="text-2xl font-semibold mb-4">
            ¡Bienvenido! Vincula tus otras cuentas
          </h1>

          <div className={isVerified ? "bg-green-500 text-white font-bold py-2 px-4 rounded-full text-center" : "bg-blue-500 text-white font-bold py-2 px-4 rounded-full text-center"}>
            {isVerified ? "Cuenta de Discord correctamente verificada" : "Vincular cuenta de Discord"}
          </div>

          {!isVerified && (
            <div className="mt-4 p-4 border rounded bg-gray-100">
              <p className="text-lg font-semibold">
                Instrucciones para vincular Discord:
              </p>
              <ol className="list-decimal ml-8 mt-2">
                <li>Abrir Discord y dirigirse al servidor donde se encuentra el bot.</li>
                <li>Enviar el siguiente comando en el chat:</li>
                <pre className="mt-2 bg-gray-200 p-2 rounded">
                  <code>{`/linkaccounts --code ${uniqueCode} --email ${emailFromAuth}`}</code>
                </pre>
                <li>
                  Asegúrate de estar conectado en Discord con la cuenta que deseas verificar.
                </li>
              </ol>
            </div>
          )}

          {!isCheckVerificationCalled && (
            <button
              onClick={checkVerification}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full"
            >
              Revisar si estoy verificado
            </button>
          )}
          
          {isCheckVerificationCalled && (
            isVerified ? (
              <span className=""></span>
            ) : (
              <button onClick={checkVerification} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full">
                Intenta de nuevo
              </button>
            )
          )}

        { trelloResponse === null && (
        <button 
        onClick={tokenToPOST ? postToTrelloCloudFunction : linkTrelloAccount}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full ml-4">
          {tokenToPOST ? "Enlazar cuenta a la ESAT" : "Vincular cuenta de Trello" }
        </button>
        )
        }
        
        { trelloResponse === "success" && (

        <div 
        className="bg-[#EF7D00] text-white font-bold py-2 px-4 rounded-full ml-4">
          Cuenta de Trello correctamente vinculada
        </div>

        )}

        { trelloResponse === "notTrelloUser" && (

        <a
        href="https://trello.com/signup"
        target="_blank"
        rel="noreferrer"
        onClick={reloadWithoutParams}
        className="bg-yellow-500 hover:bg-yellow-400 text-white font-bold py-2 px-4 rounded-full ml-4">   
          Debes de tener una cuenta en Trello, crea una aquí
        </a>

        )}

        { trelloResponse === "undefined" && (

        <div 
        className="bg-red-200 text-white font-bold py-2 px-4 rounded-full ml-4">
          Error desconocido, contacta a soporte.
        </div>

        )}



        </div>
      )}
    </div>
  );
  
};

export default App;
