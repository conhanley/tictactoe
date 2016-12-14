var myScreenname = null;
var myOpponent = null;
var myWins = 0;
var myLosses = 0;
var myChickens = 0;

var socket; // make reference to socket globally available

// This handles clicking of the buttons on the screen initially (for simple login)
$(function() {   // when document is ready
  $("#f1").submit(createUser);
});

function checkName(nameToCheck) {
	return nameToCheck === myScreenname;
}

function writeAlertMessage(result) {
  $("#message").css('color', 'green');
  $("#message").empty();
  $("#message").append(result);
  // Make the alert disappear after 3 seconds
  setTimeout(function(){ $("#message").empty(); }, 3000);
}

function createUser() {
  var myurl = "user/";
  $.ajax({
    url: myurl,
    contentType: "application/x-www-form-urlencoded",
    data: {screenname: $("#screenname1").val(),
           password: $("#password1").val(),
           },
    type: 'PUT',
    success: function(result) {
      // Write the result to the page (as an alert)
      writeAlertMessage(result);
      var str1 = $("#loginresponse").text();
			var str2 = "successful";
			// Hacky way of checking if the login was successful...
			if(str1.indexOf(str2) != -1){
				$("#f1").hide();

				// Store my screenname for the purposes of displaying it
				// and identifying my specific future actions
				myScreenname = $("#loginresponse").attr("screenname");
				// Store my win/loss record locally for now
				// Every time I emit the win/lose signal to socket,
				// this will change
				myWins = $("#loginresponse").attr("wins");
				myLosses = $("#loginresponse").attr("losses");
				myChickens = $("#loginresponse").attr("chickens");
				$("#myScreenname").text("Screen Name: " + myScreenname);
				$("#wins").text("Wins: " + myWins);
				$("#losses").text("Losses: " + myLosses);
				$("#chickens").text("Chicken: " + myChickens);
				
				
				// Create the initial lobby table
				createLobby();

				// Initially connect to the server, now that we've created our login
    		socket = io.connect();

    		// Emit our name to the server, we just joined the lobby
    		socket.emit('joinedLobby', {'screenname': myScreenname});
    		// New players (not including ourselves) might join the lobby
    		socket.on('lobbyChange', function(data) {
    			// Reset the lobby and write it all over again.
    			// Really inefficient, but oh well.
    			updateLobby(data);
    		});

    		// Now want to handle what happens if a table row is clicked
    		$('body').on('click', 'td', function() {
			    var responder = $(this).text();
			    socket.emit('challenge', {'challenger': myScreenname, 'responder': responder});
				});

				socket.on("awaitingResponse", function(data) {
					$("#mainArea").empty();
					myOpponent = data.opponent;
					$("#mainArea").append("<p>Waiting on response from " + myOpponent + "...</p>");

				});

				socket.on("giveResponse", function(data) {
					$("#mainArea").empty();
					myOpponent = data.opponent;
					$("#mainArea").html("<p>" + myOpponent + " thinks you're slow.  Put your skills to the test?</p>" + "<div class='row'><div class='col-lg-2'><button id='respondNo' type='submit' class='btn btn-primary'>No way, I'm outta here</button></div><div class='col-lg-2'><button id='respondYes' type='submit' class='btn btn-primary'>Yep, bring it on</button></div></div>");
				});

				$("#mainArea").on('click', "#respondYes", function() {
					console.log("CLICKED");
					socket.emit("respondYes", {});
				});

				$("#mainArea").on('click', "#respondNo", function() {
					myChickens++;
					updateRecord();
					updateUser();
					socket.emit("respondNo", {});
				});

				socket.on("play", function(data) {
					var drawTime = data.drawTime;
					$("#mainArea").empty();

					$("#mainArea").html("<h1 id='pageHeader' class='page-header'>Prepare yourself!</h1>");

					setTimeout(function() {
						$("#mainArea").html("<button id='hitMe' type='submit' class='btn btn-primary'>CLICK ME!!!</button>");
					}, drawTime);
				});

				$("#mainArea").on('click', "#hitMe", function() {
					socket.emit("hitMe", {});
				});

				socket.on("won", function (data) {
					//$("#mainArea").empty();
					myWins++;
					updateRecord();
					updateUser();
					writeAlertMessage(data.message);
				});

				socket.on("lost", function (data) {
					//$("#mainArea").empty();
					myLosses++;
					updateRecord();
					updateUser();
					writeAlertMessage(data.message);
				});
    		
			}
    }
  });
  return false;
}

function updateLobby(data) {
	createLobby();
	for (i = 0; i < data.lobbyPlayerSet.length; i++) {
		if (data.lobbyPlayerSet[i] !== myScreenname) {
			let htmlString = "<tr id='player'><td>" + data.lobbyPlayerSet[i] + "</td></tr>";
			$("#myTbody").append(htmlString);
		}
	}
}

function createLobby() {
	$("#pageHeader").text("Lobby");
	$("#mainArea").empty();
	$("#mainArea").html("<div class='col-lg-3'><table id='myTable' class='table'><tbody id='myTbody'><tr><th style='text-align:left'>Challenge a Player:</th></tr></tbody></table></div>");
}

// When a game ends, user gains a win, loss, or tie
function updateUser() {
  var myurl = "user/";
  var user = myScreenname;
  var wins = myWins;
	var losses = myLosses;
	var chickens = myChickens;
  $.ajax({
    url: myurl,
    contentType: 'application/x-www-form-urlencoded',
    data: {
      find: {
        "screenname" : user
      },
      update: {
        "$set" : {
          "wins" : wins,
					"losses" : losses,
					"chickens" : chickens
        }
      }
    },
    type: 'POST',
    success: function(result) {
      // Do something with the result
    }
  });
  return false;
}

function updateRecord() {
	$("#wins").text("Wins: " + myWins);
	$("#losses").text("Losses: " + myLosses);
	$("#chickens").text("Chicken: " + myChickens);
}
