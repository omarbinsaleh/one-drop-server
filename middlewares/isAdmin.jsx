const isAdmin = async (req, res, next) => {
   const filter = {};

   // get the user email from the request body
   const userEmail = req.body.userEmail;
   
   // when the user email is not provided
   if (!userEmail) {
      return res.status(401).send({
         success: false,
         message: "User's email is missing. Please provide the user's email",
         statusCode: 401
      });
   };

   // update the filter with user email and find the user;
   filter.email = userEmail;
   const user = await userCollection.findOne(filter);

   // when the user does not exist
   if (!user) {
      return res.status(401).send({
         success: false,
         message: "Unauthorized access",
      });
   };

   // when the role of the user is not admin
   if (user.role !== 'admin') {
      return res.status(401).send({
         success: false,
         message: 'Unauthorized Access',
         statusCode: 401
      })
   }

   // finally call the next function
   next();

};

module.exports = isAdmin;