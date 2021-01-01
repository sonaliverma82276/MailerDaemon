const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose= require('mongoose');
var flash = require('connect-flash');
//add-signup
const session= require('express-session');
const passport= require('passport');
const passportLocalMongoose= require('passport-local-mongoose'); //add-signup

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static("public"));
app.use(flash());
//app.use(express.staticProvider(__dirname + '/public'));

//add-signup
//session
app.use(session({
  secret: 'md-login2020',
  resave: false,
  saveUninitialized: false
}));

//passport
app.use(passport.initialize());
app.use(passport.session()); //add-signup

//mongoose
mongoose.connect("mongodb+srv://sonali:mailerdaemontest@cluster0.f86on.mongodb.net/blogDB", {useNewUrlParser: true, useUnifiedTopology: true , useFindAndModify: false} );
mongoose.set("useCreateIndex",true); //add-signup
//mongodb+srv://sonaliverma:<password>@cluster0.gql6z.mongodb.net/<dbname>?retryWrites=true&w=majority
//add-signup
const userSchema=new mongoose.Schema({
	username: {
            type: String, 
            unique: true
        },
	password: {
            type: String
        },
	name: {
            type: String, 
            unique: true
        },
    likedposts: [
        ],
    admin: {
         type:Boolean,
        default:false
    }
});

userSchema.plugin(passportLocalMongoose);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy()); 
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser()); //add-signup

const pendingSchema = new mongoose.Schema ({
         title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        date: {
            type: String,
        },
        time: {
            type: String,
        }
}) ;

const ApprovedSchema = new mongoose.Schema ({
	 title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        date: {
            type: String,
        },
        time: {
            type: String,
        },
        like: {
            type:Number,
            default:0
        }
}) ;

/*
pendingSchema.plugin(AutoIncrement, {inc_field: 'idpending'}); //id
ApprovedSchema.plugin(AutoIncrement, {inc_field: 'idapproved'}); //id */
const Pending = mongoose.model("Pending",pendingSchema);
const Approved = mongoose.model("Approved",ApprovedSchema);

app.get("/",function(req,res){
    res.render("index",{isloggedin:req.user});
});

app.get("/placement",function(req,res){
    res.render("placement");
});

app.get("/blog/show",isLoggedIn,function(req,res){
	Approved.find({},function(err,items){
     res.render("show",{newshow:items,user:req.user.likedposts,admin:req.user.admin});
	});
    
});

app.post("/like/:id",isLoggedIn,function(req,res){
   Approved.findById(req.params.id, function (err, theUser) {
        if (err) {
            console.log(err);
        } else {
            theUser.like += 1;
            var id=req.params.id;
            var p={id};
            req.user.likedposts.push(p);
            req.user.save();
            theUser.save();
            console.log(req.params.id +" got " + theUser.like +" likes");
            res.send('SUCCESS likes increased'); //something like this...
        }
    }); 
}); 

app.post("/unlike/:id",isLoggedIn,function(req,res){
   Approved.findById(req.params.id, function (err, theUser) {
        if (err) {
            console.log(err);
        } else {
            theUser.like -= 1;
            var id=req.params.id;
            var p={id};
            req.user.likedposts.pull(p);
            req.user.save();
            theUser.save();
            console.log(req.params.id +" got " + theUser.like +" likes");
            res.send('SUCCESS likes decreased'); //something like this...
        }
    }); 
}); 

app.get("/admin/blog/approve",isAdmin,function(req,res){
	Pending.find({},function(err,items){
     res.render("admin-approve",{newitems:items});
	});
    
});

app.post("/admin/delete",isAdmin,function(req,res){
    const button=req.body.delete;
   // console.log(button+" ");
   Pending.findByIdAndRemove(button,function(err){
     if(!err){
     	console.log("Succesfully deleted!");
     	res.redirect("/admin/blog/approve");
     }
   });
});

app.post("/admin/post/delete",isAdmin,function(req,res){
    const button=req.body.delete;
   // console.log(button+" ");
   Approved.findByIdAndRemove(button,function(err){
     if(!err){
        console.log("Succesfully deleted!");
        res.redirect("/blog/show");
     }
   });
});

app.post("/admin/approve",isAdmin,function(req,res){
	const button=req.body.approve;
    var Title="start";
	var Content="start";
	Pending.findById(button,function(err,pending){
        if(!err){
             Title=pending.title;
             Content=pending.content;
             const approved = new Approved ({
                    title: Title,
                   content: Content,
                   name:pending.name,
                   date:pending.date,
                   time:pending.time
	               }); 
	          approved.save();
	          console.log("Approved "+Title);
        }
	});
	
	Pending.findByIdAndRemove(button,function(err){
     if(!err){
     	console.log("Succesfully deleted!");
     	res.redirect("/admin/blog/approve");
     }
   });
});


app.get("/blog/compose",isLoggedIn,function(req,res){
	res.render("compose");
});

app.post("/blog/compose",isLoggedIn,function(req,res){
	const Title=req.body.title;
	const Content =req.body.content;
    const name = req.user.name;
    var d = new Date();
    var m=d.getMonth();
    var month=["January","February","March","April","May","June","July","August","September","October","November","December"];
	const datee= month[m]+" "+d.getDate() +" "+d.getFullYear();
    const time=d.getHours()+":"+d.getMinutes();
    const pending = new Pending ({
       title: Title,
       content: Content,
       name: name,
       date:datee,
       time:time
	}); 
	pending.save();
	console.log("Pending: "+Title+"\nuser: "+name+"\ndate: "+datee);
	res.redirect("/blog/compose");
});

//isLoggedIn
 function isLoggedIn(req,res,next){
        if(req.isAuthenticated()){
            req.id=req.user.id;
            console.log(req.user.id);
            return next();
     }
     res.redirect("/signin");
    }
//isAdmin
function isAdmin(req,res,next){
    if(req.isAuthenticated() && (req.user.admin===true))
    {
        req.id=req.user.id;
        console.log(req.user.id);
        return next();
    }
 req.flash('notadmin', 'Your must have admin rights to perform this action!!'); 
  res.redirect('/admin_error_login');
   // window.alert("Your must have admin rights to perform this action!");
   // res.redirect("/");
    
}
  
//signup
app.get("/signup",function(req,res){
    res.render("signup");
});
app.post("/signup",function(req,res){
	req.body.name
    req.body.username
    req.body.password
    User.register(new User({username: req.body.username }), req.body.password,function(err,user){
         if(err){ console.log("123FAILED!!!!!");
             console.log(err);
             res.redirect("/signup"); 
         }
         passport.authenticate("local")(req,res,function(){
             console.log(req.body.name);
             User.findOneAndUpdate({username:req.body.username},{name: req.body.name}, function(err, result) {
    if (err) {
    	console.log("FAILED!!!!!");
      console.log(err);
      req.flash('signuperror', 'Error in singup, please try again!'); 
  res.redirect('/signup_error');

    } else { console.log("SUCCESS!!!!!");
    console.log(result);
    res.redirect("/"); //home
    }
  });
            
   });
        });
    });
//signin
app.get("/signin",function(req,res){
    res.render("signin");
});
app.post("/signin",function(req,res){
     const user= new User({
     	username :req.body.username,
     	password :req.body.password
     });

     req.login(user, function(err){
     	if(err) {
     		console.log(err);
            res.redirect("/signup");
     	}
     	else {
     		passport.authenticate("local")(req,res,function(){
             console.log("successful");
            res.redirect("/");  //home
   });
     	}
     });

});
//logout

app.get("/logout",function(req,res){
    console.log("logout");
	req.logout();
	res.redirect("/");
}); 

//flash
app.get('/admin_error_login', (req, res) => { 
    res.send(req.flash('notadmin')); 
}); 
app.get('/signup_error', (req, res) => { 
    res.send(req.flash('signuperror')); 
});


let port = process.env.PORT;
if(port == null || port==""){
    port=3000;
}

app.listen(port, function() {
  console.log("Server started on port");
});
