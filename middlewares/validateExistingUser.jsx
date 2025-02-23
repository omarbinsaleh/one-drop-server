const validateExistingUsre = async (req, res, next) => {
   // 01. get the user email from the request body
   const { email } = req.body;

   // 02. create a filter using the user email
   const filter = { email: email }

   // 03. find the specific user using the filter created above
   const isExistingUser = await userCollection.findOne(filter);

   // 04. modify the request body
   if (isExistingUser) {
      // add a property named 'isExistingUser' in the request body
      req.body.isExistingUser = true;
      
      // add another property 'user' in the request body which will hold the user information
      req.body.user = isExistingUser;
   } else {
      req.body.isExistingUser = false;
   }

   // 05. go to the next step
   next();
};

module.exports = validateExistingUsre;