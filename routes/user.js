let fs = require('fs');
let http = require('http');
let url = require('url');

// include my model for this application
var userModel = require("../models/user.js")

// Define the routes for this controller
exports.init = function(app) {
  //app.get('/', index); // essentially the app welcome page
  // The collection parameter maps directly to the mongoDB collection
  app.put('/user', doUserCreate); // CRUD Create
  app.get('/user', doUserRetrieve); // CRUD Retrieve
  app.post('/user', doUserUpdate); // CRUD Update
  app.delete("/user", doUserDelete); // CRUD Delete
  // The CRUD Delete path is left for you to define
}

// No path:  display instructions for use
index = function(req, res) {
  res.render('help', {title: 'MongoDB Test'})
};

/********** CRUD Create *******************************************************
 * Take the object defined in the request body and do the Create
 * operation in userModel.  (Note: The userModel method was called "insert"
 * when we discussed this in class but I changed it to "create" to be
 * consistent with CRUD operations.)
 */ 
doUserCreate = function(req, res){
  /*
   * A series of console.log messages are produced in order to demonstrate
   * the order in which the code is executed.  Given that asynchronous 
   * operations are involved, the order will *not* be sequential as implied
   * by the preceding numbers.  These numbers are only shorthand to quickly
   * identify the individual messages.
   */
  /*
   * First check if req.body has something to create.
   * Object.keys(req.body).length is a quick way to count the number of
   * properties in the req.body object.
   */
  if (Object.keys(req.body).length == 0) {
    res.render('message', {obj: "No create message body found"});
    return;
  }
  /*
   * Call the model Create with:
   *  - The collection to do the Create into
   *  - The object to add to the model, received as the body of the request
   *  - An anonymous callback function to be called by the model once the
   *    create has been successful.  The insertion of the object into the 
   *    database is asynchronous, so the model will not be able to "return"
   *    (as in a function return) confirmation that the create was successful.
   *    Consequently, so that this controller can be alerted with the create
   *    is successful, a callback function is provided for the model to 
   *    call in the future whenever the create has completed.
   */
  var screennameCheck = { screenname : req.body.screenname }; // object with just the screen name
  // First check if the username already exists
  userModel.retrieve(
    screennameCheck,
    function(modelData) {
      // If we have a user of that screenname already, 
      // log them in if correct combo, or inform them that they'll need a different screen name
      if (modelData.length) {
        if (modelData[0].password == req.body.password) {
          var success = "Login successful!";
          res.render('message', {obj: success, screenname: modelData[0].screenname, wins: modelData[0].wins, losses: modelData[0].losses, chickens: modelData[0].chickens});
        } else {
          res.render('message', {obj: "Login combination for " + modelData[0].screenname + " is incorrect. Please try again.", screenname: "", wins: "", losses: "", chickens: ""});
        }
      } else {
        var newUser = { screenname: req.body.screenname, password: req.body.password, wins: 0, losses: 0, chickens: 0}
        userModel.create ( newUser,
                      function(result) {
                        // result equal to true means create was successful
                        var success = (result ? "Account successfully created.  Better be quick!" : "Login unsuccessful :(");
                        res.render('message', {obj: success, screenname: req.body.screenname, wins: 0, losses: 0, chickens: 0});
        });
      }
  });
}

/********** CRUD Retrieve (or Read) *******************************************
 * Take the object defined in the query string and do the Retrieve
 * operation in userModel.  (Note: The userModel method was called "find"
 * when we discussed this in class but I changed it to "retrieve" to be
 * consistent with CRUD operations.)
 */ 

doUserRetrieve = function(req, res){
  /*
   * Call the model Retrieve with:
   *  - The collection to Retrieve from
   *  - The object to lookup in the model, from the request query string
   *  - As discussed above, an anonymous callback function to be called by the
   *    model once the retrieve has been successful.
   * modelData is an array of objects returned as a result of the Retrieve
   */
  userModel.retrieve(
    req.query,
		function(modelData) {
		  if (modelData.length) {
        res.render('results',{title: 'Tic-Tac-Toe', obj: modelData});
      } else {
        var message = "No documents with "+JSON.stringify(req.query)+ 
                      " in collection users found.";
        res.render('message', {obj: message});
      }
		});
}

/********** CRUD Update *******************************************************
 * Take the MongoDB update object defined in the request body and do the
 * update.  (I understand this is bad form for it assumes that the client
 * has knowledge of the structure of the database behind the model.  I did
 * this to keep the example very general for any collection of any documents.
 * You should not do this in your project for you know exactly what collection
 * you are using and the content of the documents you are storing to them.)
 */ 
doUserUpdate = function(req, res){
  // if there is no filter to select documents to update, select all documents
  var filter = req.body.find ? req.body.find : {};
  // if there no update operation defined, render an error page.
  if (!req.body.update) {
    res.render('message', {obj: "No update operation defined"});
    return;
  }
  var update = req.body.update;
  /*
   * Call the model Update with:
   *  - The collection to update
   *  - The filter to select what documents to update
   *  - The update operation
   *    E.g. the request body string:
   *      find={"name":"pear"}&update={"$set":{"leaves":"green"}}
   *      becomes filter={"name":"pear"}
   *      and update={"$set":{"leaves":"green"}}
   *  - As discussed above, an anonymous callback function to be called by the
   *    model once the update has been successful.
   */
  userModel.update(  filter, update,
		                  function(status) {
              				  res.render('finished',{obj: "Please do play again!"});
		                  });
}

/********** CRUD Delete *******************************************************
 * The delete route handler is left as an exercise for you to define.
 */

doUserDelete = function(request, response){
	var filter = {screenname : request.body.screenname};
	userModel.delete(filter, function(status){
		response.render('message', { obj: status });
	});
}


