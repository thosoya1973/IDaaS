// The Auth0 client, initialized in configureClient()
let auth0 = null;
  console.log("App Initialized.");

/**
 * Starts the authentication flow
 */
const login = async (targetUrl) => {
  try {
    console.log("Logging in", targetUrl);

    const options = {
      redirect_uri: window.location.origin
    };

    if (targetUrl) {
      options.appState = { targetUrl };
    }

    await auth0.loginWithRedirect(options);
  } catch (err) {
    console.log("Log in failed", err);
  }
};

/**
 * Executes the logout flow
 */
const logout = () => {
  try {
    console.log("Logging out");
    auth0.logout({
      returnTo: window.location.origin
    });
  } catch (err) {
    console.log("Log out failed", err);
  }
};

/**
 * Retrieves the auth configuration from the server
 */
const fetchAuthConfig = () => fetch("/auth_config.json");

/**
 * Initializes the Auth0 client
 */
const configureClient = async () => {
  const response = await fetchAuthConfig();
  const config = await response.json();

  auth0 = await createAuth0Client({
    domain: config.domain,
    client_id: config.clientId,
    audience: config.audience,
    scope: "read:messages"
  });
};

/**
 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
 * is prompted to log in
 * @param {*} fn The function to execute if the user is logged in
 */
const requireAuth = async (fn, targetUrl) => {
  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    return fn();
  }

  return login(targetUrl);
};

// Will run when page finishes loading
window.onload = async () => {
  await configureClient();

  updateUI();

  const isAuthenticated = await auth0.isAuthenticated();

  if (isAuthenticated) {
    // show the gated content
    return;
  }

  // NEW - check for the code and state parameters
  const query = window.location.search;
  if (query.includes("code=") && query.includes("state=")) {

    // Process the login state
    await auth0.handleRedirectCallback();
    
    updateUI();

    // Use replaceState to redirect the user away and remove the querystring parameters
    window.history.replaceState({}, document.title, "/");
  }
};

const updateUI = async () => {
  const isAuthenticated = await auth0.isAuthenticated();

  document.getElementById("btn-logout").disabled = !isAuthenticated;
  document.getElementById("btn-login").disabled = isAuthenticated;

  // NEW - enable the button to call the APIs
  document.getElementById("btn-call-api").disabled = !isAuthenticated;
  document.getElementById("btn-call-api-pizza").disabled = !isAuthenticated;

  // NEW - add logic to show/hide gated content after authentication
  if (isAuthenticated) {
    document.getElementById("gated-content").classList.remove("hidden");

    document.getElementById(
      "ipt-access-token"
    ).innerHTML = await auth0.getTokenSilently();

    document.getElementById("ipt-user-profile").textContent = JSON.stringify(
      await auth0.getUser()
    );

  } else {
    document.getElementById("gated-content").classList.add("hidden");
  }
};

const callApi = async () => {
  try {

    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();

    // Make the call to the API, setting the token
    // in the Authorization header
    const response = await fetch("/api/private", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Fetch the JSON result
    const responseData = await response.json();

    // Display the result in the output element
    const responseElement = document.getElementById("api-call-result");

    responseElement.innerText = JSON.stringify(responseData, {}, 2);

} catch (e) {
    // Display errors in the console
    console.error(e);
  }
};

const callApiPizza = async () => {
  try {

    // Get the access token from the Auth0 client
    const token = await auth0.getTokenSilently();

    // Make the call to the API, setting the token
    // in the Authorization header
    const response = await fetch("/api/pizza", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Fetch the JSON result
    const responseData = await response.json();

    // Display the result in the output element
    const responseElement = document.getElementById("api-call-pizza-result");

    responseElement.innerText = JSON.stringify(responseData, {}, 2);

} catch (e) {
    // Display errors in the console
    console.error(e);
  }
};
