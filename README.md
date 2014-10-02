Routey
======

Simple *convention over configuration* route setup for [Express](http://expressjs.com/)/[NodeJS](http://nodejs.org/).

Routey can be used to simply and quickly build a [REST API](http://stackoverflow.com/questions/671118/what-exactly-is-restful-programming).

Routey allows [URLs](http://en.wikipedia.org/wiki/Url) to be routed to particular handlers. Handlers are associated with particular [HTTP request methods](http://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol#Request_methods) (also known as HTTP verbs) based on the name of the file that the handler is defined in.

Each handler is defined defined in a file that is named for the HTTP verb being handled, for example *get.js*, *post.js*, *put.js* and *delete.js*. Handlers can be defined in sub-directories to create nested routes.


Release Notes
-------------

v0.0.10

Routey now supports testing REST APIs from the command line using _Routey Testbed_. See end of README for details.


Installation
------------

First make sure you have [NodeJS](http://nodejs.org/) installed! 

To install routey via [npm](http://en.wikipedia.org/wiki/Npm_(software)):

    npm install routey --save

You will probably want to install Express as well (it doesn't come bundled with Routey):

    npm install express --save


Examples
--------

Many examples (ranging from simple to advanced) can be found under the *examples* directory.


Route Handlers
--------------

When you initialize Routey you point it at your *route configuration directory*. This directory contains route handlers. There are three kinds of handlers: Open route, close route and HTTP verb. All route handler files are optional, defining the handlers allows you to add functionality to your REST API.

HTTP verb handlers are defined in files that are named for the verbs. 

As an example let's give a name to our *route configuration directory*. We'll call it *myrestconfig* and add some handlers to it for the HTTP verbs:

	myrestconfig/
		get.js 			<-- Optional file, adds a HTTP get handler to this route.
		post.js 		<-- Optional, adds HTTP post.
		put.js 			<-- Optional, adds HTTP put.
		delete.js 		<-- Optional, adds HTTP delete.

A setup like this creates a route with handlers for HTTP get, post, put and delete. The URL for the route depends on how you initalize Routey. As an example let's say Routey was initialized with parent route set to */myrestapi*.  This means the routes will be accessible under the parent route. The port number for the server is setup to whatever you want when you initialize Express, for the example let's say that the port number is 3000.

The following URLs are defined (assuming access from local machine and port 3000):

	http://localhost:3000/myrestapi/		<-- Supports HTTP get, post, put and delete.

A REST API with only a single route is a bit useless, so let's add some sub-routes! Sub-routes are defined by creating nexted *route configuration directories*:

	myrestconfig/
		get.js 			<-- HTTP get handler for root-route.
		sub/			<-- Sub-directory with route configuration.
			get.js      <-- HTTP get handler for sub-route.
			post.js 	<-- Adds HTTP post.
			put.js 		<-- Adds HTTP put.
			delete.js 	<-- Adds HTTP delete.

Now we have two routes defined:

	http://localhost:3000/myrestapi/		<-- Root-route, supports HTTP get.
	http://localhost:3000/myrestapi/sub/	<-- Sub-route, supports HTTP get, post, put and delete.


We can nest sub-routes to any level required:

	myrestconfig/
		sub1/				<-- Sub-directory with route configuration.
			sub2/			<-- Nested sub-directory with route configuration.
				sub3/		<-- Nested sub-directory with route configuration.
					get.js  <-- HTTP get handler.

This gives us the following route:

	http://localhost:3000/myrestapi/sub1/sub2/sub3/		<-- Sub-route, supports HTTP get.

A setup like this with sub-routes defines a tree of routes. When a route is handled Routey will walk down the tree invoking nested *open* handlers at each level until it reaches the end of the route. At that point it will invoke the appropriate HTTP verb handler. After that it will walk back up the tree invoking *close* handlers at each level until reaches the root-route.

In the previous example this means that sub1 is opened before sub2, and sub2 is opened before sub3. Then after the route is handled (by *get.js* in this example) sub3 is closed, followed by sub2 being closed, followed by sub1 being closed.

This allows common initalization code to be shared among multiple sub-routes. For example *sub1* might open a database connection which is then used by multiple sub-routes before it closes the sub-route after the database has been used.

Route open and close handlers are define in a file called *route.js*.


Server Setup
------------

Here is an example of the main server file that initializes Routey (eg server.js):

    // Require and instantiate Express.
	var express = require('express');
	var app = express();

    // This object is used to pass configuration to Routey.    
    var routeyConfig = {

        // Specifies the route configuration directory.
        // This directory that contains Javascript files that specify route configuration and route handlers. 
        // The example path here is relative to the current script, although you can also use an absolute path if required.
        routeConfigPath: "./myrestconfig",     

        //
        // All of the following parameters are optional, included to show what is possible.
        //

        // Enable verbose logging to see what Routey is doing!
        verbose: true,                 

        // Parent route for URLs in your rest API.
        // If not specified this just defaults to '/'.
        parentRoute: "/myrestapi",

        // This object specifies global parameters to pass to all of your route handlers.
        handlerParams: {
            // For example if you are create a REST API for a database, this is a good place to pass
            // in your database connection details.
            db: "somedatabase@someserver:1234",
        }
    };

    // Require Routey.
	var routey = require('routey');

    // Initialize routey.
    // The Express app is passed in.
    // This reads the route configuration directory and sets up appropriate Express route handlers for you.
	routey(routeyConfig, app);

	// Start the server.
	var server = app.listen(3000);


Route Handlers
--------------

Routes can be defined by creating appropriately named files in your route configuration directory. For example *get.js* defines a handler for HTTP get.  Supported verbs are *get*, *post*, *put* and *delete*.

You can make a handler for HTTP get by adding a *get.js* that looks like this:

	modules.exports = {
	    handler: function (req, res, params) {
	        res.send('an example!');
	    },
	};

Alternately you can export a function that returns your handler (because this is easier to mock if you are using something like [mockery](https://github.com/mfncooper/mockery)):

	module.exports = function () {

		var somemodule = require('somemodule');

		return {
		    handler: function (req, res, params) {
		        res.send('first example!');
		    },
		};
	};

If you put that *get.js* under your route configuration directory, for example it lives in *./myrestconfig/get.js*, and assuming you have set the parent route to */myrestapi* you will now have a HTTP get handler defined for the route */myrestapi*.

Similar handlers can be defined in *post.js*, *put.js* and *delete.js* for the other HTTP verbs.

Handlers can be defined in sub-directories to create nested sub-routes.  For example you create a sub-directory under your route configuration directory called *sub1*, then under that you create another called *sub2*, then under that you put a HTTP get handler. This gets you a HTTP get handler for the route */myrestapi/sub1/sub2*.


Opening and Closing Routes
--------------------------

When a child route is handled we can setup code to handle the *opening* and *closing* of the route.

A great example of this is a REST API for accessing a database. Say for example we have a route */db/foo* which is intended to retrieve all foos from our database. When the *db* parent-route is opened it should open the database.  Then when the *foo* sub-route is opened it should query the database to retreive the *foo* collection (sorry, MongoDB bias showing through here). Then with the database and the collection a HTTP verb handler should be invoked to query or modify the database collection.

To define open and close handlers for a route we put a *route.js* in the directory that represents the route. We then define *openRoute* and *closeRoute* functions. 

Here is the example *route.js* from the *db* sub-directory (path: *./myrestconfig/db/route.js*):

	module.exports = {

	    openRoute: function (req, res, params) {
	    	// Open the database or something!
	    },

	    closeRoute: function (req, res, params) {
	    	// Close the database, or whatever you like!
	    },
	};

Here is the example *route.js* from the *foo* subdirectory (*./myrestconfig/db/foo/route.js*). The *closeRoute* is omitted because it is not needed in this case.

	module.exports = {

	    openRoute: function (req, res, params) {
	    	// Open the collection or something!
	    },

	};

Now we can define simple HTTP verb handlers under the *foo* directory, here is an example of *get.js*:

	modules.exports = {
	    handler: function (req, res, params) {
	        // Use the collection that was opened to retreive documents.
	        var data = ... retreive documents ....
	        
	        // Then send the documents to the client as JSON.
	        res.json(data);
	    },
	};

In this example, handlers for HTTP post, put and delete can also be defined to provide a CRUD API for the database.


Handler Parameters and Asynchronous Route Handling
--------------------------------------------------

You are probably going to need to pass parameters from the open handler to the route handler. Also, in any of your handlers you may need to do some asynchronous work before passing control onto the sub-route handler that is next in the chain.

For simple synchronous open handlers passing parameters is simple, just return an object:

	module.exports = {

	    openRoute: function (req, res, params) {

	    	var handlerParams = {};
	    	
	    	// Do something synchronous...

	    	handlerParams.db = ... 

	    	return handlerParams;
	    },

	};

This allows parameters to be defined that are passed to the handler for the sub-route.  The parameters are available as the *params* argument to the handler:

	modules.exports = {
	    handler: function (req, res, params) {
	        // *params* has been defined by the open handler, use it as you will!
	    },
	};


The parameters are also passed to open and close handlers for sub-routes and to the associated close handler.

Asynchronous handling is simple. All types of handlers can accept an *async* parameter that they can use to initiate and later complete an asynchronous operation. *start* is called to start the operation. This returns a *done* function which is called when the operation has completed. 

Open and close handlers:

	module.exports = {

	    openRoute: function (req, res, params, async) {
	    	var done = async.start();

	    	// ... do some async operation ...

	    	// Later, call done.
	    	done();
	    },

	    closeRoute: function (req, res, params, async) {
	    	var done = async.start();

	    	// ... do some async operation ...

	    	// Later, call done.
	    	done();
	    },
	};

HTTP verb handler:

	modules.exports = {
	    handler: function (req, res, params, async) {
	    	var done = async.start();

	    	// ... do some async operation ...

	    	res.send('send something to the client...');

	    	// Later, call done.
	    	done();
	    },
	};

Asynchronous open handlers can create handler parameters by passing an object to the *done* function instead of just returning them:

	module.exports = {

	    openRoute: function (req, res, params, async) {
	    	var done = async.start();

	    	var handlerParams = {};

	    	// ... do some async operation ...

	    	handlerParams.something = ... // Initialize handler parameters.

	    	// Later, call done.
	    	// Pass handler parameters to sub-handlers.
	    	done(handlerParams);
	    },
	};


Customizing URLs
------------------

The URL for a particular route can be customized by setting the *route* option in the *route.js* file. For example you have the file *route.js* under *./myrestconfig/sub/route.js*. Normally the URL for this would be */myrestapi/sub/*, however by customizing the route as shown in the following code snippet we can change the URL to */myrestapi/somethingelse/*:

	module.exports = {

		// Customized route:
		route: 'somethingelse'

	    openRoute: // open handler if you want it...

	    closeRoute: // close handler if you want it...
	};

URLs for specific HTTP verbs can also be customzied in the same way. For example you have the file *delete.js* in *./myrestconfig/bar/delete.js* and you customize the URL, so that instead of the URL being */myrestapi/bar/* you can make the URL more specific if you like for example */myrestapi/bar/justdeleteit/*:

	modules.exports = {

		route: 'justdeleteit',

	    handler: function (req, res, params, async) {
    		// delete the database entry, or whatever you want!
	    },
	};

Of course that previous code snippet may not be very useful. What will be useful is being able to extract the *id* of the database object from a URL that might look like */myrestapi/bar/1234/*, where *1234* is the id of the object to delete.

	modules.exports = {

		route: ':id',

	    handler: function (req, res, params, async) {
	    	var id = req.params.id;
    		// Now we know the ID of the database entry to delete, let's delete it!
	    },
	};


Routey Testbed
--------------

_Routey Testbed_ allows you to test your REST APIs from the command line.

Run it with _node_ and specify the path to _routey_testbed.js_. For example, with Routey installed in _node_modules_:

	node ./node_modules/routey/routey_testbed.js <options>

In case you need a reminder of what your REST API can do, use Routey Testbed to list the registered routes:

	node routey_testbed.js --routes
	
The main purpose of the testbed is to invoke your route handlers from the command line. For example, to test HTTP GET for the route _/foo/bar_:

	node routey_testbed.js get /foo/bar

The output of your route handler (ie the output of your REST API) is printed to the command line.

You can also test the other http verbs. To supply data, eg for a HTTP POST, use the --data option:

	node routey_testbed.js post /foo/bar --data="some data"

If it's more convenient put your data in a file:

	node routey_testbed.js post /foo/bar --data-file=mydata.json

The testbed defaults to loading route handlers from the _rest_ sub-directory under the current directory. This and other options can be set through a config file in the local directory called _routey-config.json_ or by specifying a config file using the _--config_ option. The config file is as defined in _Server Setup_.


Following is the full spec for the testbed.

Usage:

	node <path-to-routey-testbed.js> [--config=<config-file-path>] <http-method> <url-to-test> [--data=<post-or-put-data>]

Where __http-method__ is one of: _get_, _post_, _put_ or _delete_.

Or:

	node <path-to-routey-testbed.js> --routes




That's all folks!
Please give feedback and help make Routey better!
