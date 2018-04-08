async function doLogin(username) {
	try {
		await chat.login(username)
		document.cookie = "loggedIn=true; max-age:60"
		document.cookie = "username=" + username
		var x = document.cookie
		console.log(x)
	} catch (error) {
		// Login error occurred
		console.error("Couldn't sign in!")
		window.alert("There was a login error, please try again.")
	}
}

function checkLogin() {
	var loggedIn = getCookie("loggedIn")
	console.log(loggedIn)
	if (loggedIn == "true") {
		console.log("Ya did it")
		return true
	} else {
		console.log("Not logged in")
	}
	return false
}

function getCookie(cname) {
	var name = cname + "="
	var decodedCookie = decodeURIComponent(document.cookie)
	var ca = decodedCookie.split(";")
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i]
		while (c.charAt(0) == " ") {
			c = c.substring(1)
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length)
		}
	}
	return ""
}
