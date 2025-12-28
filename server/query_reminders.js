require('dotenv').config();
const mongoose = require('mongoose');
const Reminder = require('./models/reminder.model');
const Event = require('./models/event.model');
const User = require('./models/user.model');

(async ()=>{
  try{
    await mongoose.connect(process.env.MONGO_URI);
    const r = await Reminder.find().sort({createdAt:-1}).limit(5).populate('event').populate('user');
    console.log(JSON.stringify(r.map(x=>({id:x._id,email:x.email,remindAt:x.remindAt,sent:x.sent,event:x.event?{id:x.event._id,title:x.event.title,eventDate:x.event.eventDate}:null})),null,2));
    process.exit(0);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
})();
