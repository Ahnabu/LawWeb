We want to start working on Lawyer dashboard and need to make full dashboard functioonal today. But at frist update #projectoverview doc. mark as done those are completed. 

- use h3 for all titles in full Lawyer dashsboard

- Make appointments page fully functional with the backend. check in the backend for api already exits or not . if not make new apis. Then finish implement in frontend. all appointments of that lawyer should show in Lawyer appointment page. use tabular view. table should be compact. when click view details button a modal will open with the details.
- Same for MyCases page also. backend first and integrate with frontend. But keep the secuirity concern in mind. Data should not show in the network tab of browser. Here Lawyer can add cases with their details. Then also can view all of the cases he took in a tabular view. a button needed or icon to make the case featured. Then View Details --> A new page will open which show the full details. But at first search on web on lawfirm which property a cases needed or had then modify the case schema in backend and then make the form in frontend. 

- Fix Availability page fully functional. There is an error on fetch lawyer availavility on this api -(http://localhost:5000/api/lawyers/me/availability
) ....here is the error. Get lawyer availability error: CastError: Cast to ObjectId failed for value "me" (type string) at path "lawyerId" for model "LawyerAvailability"
    at SchemaObjectId.cast (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\schema\objectId.js:252:11)
    at SchemaObjectId.SchemaType.applySetters (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\schemaType.js:1372:12)
    at SchemaObjectId.SchemaType.castForQuery (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\schemaType.js:1798:17)
    at cast (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\cast.js:386:32)
    at model.Query.Query.cast (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:5212:12)
    at model.Query.Query._castConditions (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:2409:10)
    at model.Query._findOne (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:2756:8)
    at model.Query.exec (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:4797:80)
    at processTicksAndRejections (node:internal/process/task_queues:103:5)
    at async getLawyerAvailabilityPublic (C:\Projects\JobTask\LawWeb\backend\src\controllers\lawyerController.ts:125:26) {
  stringValue: '"me"',
  messageFormat: undefined,
  kind: 'ObjectId',
  value: 'me',
  path: 'lawyerId',
  reason: BSONError: input must be a 24 character hex string, 12 byte Uint8Array, or an integer
      at new ObjectId (C:\Projects\JobTask\LawWeb\backend\node_modules\bson\src\objectid.ts:113:15)
      at castObjectId (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\cast\objectid.js:25:12)
      at SchemaObjectId.cast (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\schema\objectId.js:250:12)
      at SchemaObjectId.SchemaType.applySetters (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\schemaType.js:1372:12)
      at SchemaObjectId.SchemaType.castForQuery (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\schemaType.js:1798:17)
      at cast (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\cast.js:386:32)
      at model.Query.Query.cast (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:5212:12)
      at model.Query.Query._castConditions (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:2409:10)
      at model.Query._findOne (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:2756:8)
      at model.Query.exec (C:\Projects\JobTask\LawWeb\backend\node_modules\mongoose\lib\query.js:4797:80),
  valueType: 'string'
}

- Profile page is okay. But need to update in backend and frontend. add update profile functionality. then in backend add new model inherited from user or do what is suitable for current structure. 
Identity & Auth

userId: Reference to the main user authentication document.

firstName: String.

lastName: String.

profileImageUrl: String (URL).

Bilingual Details (Objects containing en and bn)

designation: Job title (e.g., Senior Partner).

bio: Professional summary and success stories.

Contact Information

contactEmail: String (Unique).

contactPhone: String.

whatsappNumber: String (Required for your UI integration).

Professional Credentials

barNumber: String (Unique).

yearAdmitted: Number.

practiceAreas: Array of Strings (e.g., ["Civil", "Corporate"]).

languages: Array of Strings.

education: Array of Objects (Degree, Institution, Year).
Certification: Array of obj
Operational Status

hourlyRate: Number (Optional).

isActive: Boolean (To toggle directory visibility without deleting records).

joinedAt: Date.

createdAt / updatedAt: Dates