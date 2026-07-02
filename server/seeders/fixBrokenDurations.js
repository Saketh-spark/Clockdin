const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

async function fixBrokenFields() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  const Event = require('../models/event.model')
  
  const events = await Event.find()
  let fixedDuration = 0
  let fixedDescription = 0
  let fixedLocation = 0
  
  for (const event of events) {
    const updates = {}
    
    // Fix duration if it's a paragraph instead of a short value
    if (event.duration && event.duration.length > 30) {
      const wordCount = event.duration.split(/\s+/).length
      const durationMatch = event.duration.match(
        /(\d+\s*-?\s*\d*\s*(month|months|week|weeks|day|days))/i
      )
      
      if (durationMatch) {
        updates.duration = durationMatch[0]
      } else {
        updates.duration = null
      }
      fixedDuration++
    }
    
    // Fix description if it's way too long
    if (event.description && event.description.length > 300) {
      updates.description = event.description.substring(0, 280) + '...'
      fixedDescription++
    }
    
    // Fix location if it looks like a sentence
    if (event.location && event.location.split(/\s+/).length > 6) {
      updates.location = event.location.split(/\s+/).slice(0, 3).join(' ')
      fixedLocation++
    }
    
    if (Object.keys(updates).length > 0) {
      await Event.findByIdAndUpdate(event._id, { $set: updates })
    }
  }
  
  console.log(`Fixed duration on ${fixedDuration} events`)
  console.log(`Fixed description on ${fixedDescription} events`)
  console.log(`Fixed location on ${fixedLocation} events`)
  console.log('Done!')
  process.exit(0)
}

fixBrokenFields().catch(err => {
  console.error('Fix failed:', err)
  process.exit(1)
})
