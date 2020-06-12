const express = require('express');
const { userHelper, jobHelper, locationHelper, techHelper, connectHelper } = require('../../models/classHelpers');
const restricted = require('../../Middleware/restricted');
const decoder = require('jwt-decode')


const router = express.Router();

router.get('/profilePackage',restricted(), async (req, res, next) => {
    try {
        const tech = await techHelper.getAll();
        const location = await locationHelper.getAll();
        const jobs = await jobHelper.getAll();

        const profile_starter = {
            tech,
            location,
            jobs
        }
        return res.status(200).json(profile_starter);
    } catch (e) {
        console.log(e);
        next();
    }
});

router.get('/', restricted(), async (req, res, next) => {
   try {
       const token = req.headers.authorization;
       const tokenAuth = decoder(token);

    const allUsers = await userHelper.getAll();
    async function userData(arr) {

        try {
            if (!arr.job_title_id) {
                arr.job_title_id = 1
            }
            if (!arr.location_id) {
                arr.location_id = 1
            }
            const job = await jobHelper.findById(arr.job_title_id);
            const location = await locationHelper.findById(arr.location_id);
            const tech_stack = await techHelper.userTech(arr.id);
            delete arr.password;
            const tech_id =  tech_stack.map(arr => {
                return arr.id
            })

            return {
                ...arr,
                job: job.job_title,
                location: location.location,
                techs: tech_id
            }
        } catch (e) {
            console.log(e)
        }
    }
    const getData = async () => {
        return Promise.all(allUsers.map(arr => userData(arr)))
    }
    getData().then(data => {
        res.status(200).json(data)
    })
   } catch (e) {
       next(e);
   }
});

router.get('/:id', restricted(), async (req, res, next) => {
   try {
        const user_id = req.params.id;
        const user = await userHelper.findById(user_id);
            if (!user) {
                res.status(404).json({
                    errorMessage: `User with the id of ${user_id} was not found`
                })
            }
        if (!user.job_title_id) {
            user.job_title_id = 1
        }
        const job = await jobHelper.findById(user.job_title_id);

        if (!user.location_id) {
            user.location_id = 1
        }
        const location = await locationHelper.findById(user.location_id);
        const tech = await techHelper.userTech(user.id);
        const tech_id = tech.map(arr => {
            return arr.id
        })
       const myConns = await connectHelper.myConnections(user.id)
       const myConnsAcc = myConns.filter(arr => {
           return arr.userAcc === user.id
       })
       const myConnsReq = myConns.filter(arr => {
           return arr.userReq === user.id
       })

       const myRequests = await connectHelper.newConnections(user.id)
       const myOutGoingRequests = await connectHelper.newConnectionRequests(user_id)

       async function connData(arr) {
               let connProfile
               try {
                   connProfile = await userHelper.findById(arr)
                   // TODO refacotr this helper model to a utiles folder
                   if (!connProfile.job_title_id) {
                     connProfile.job_title_id = 1
                }
                const job = await jobHelper.findById(connProfile.job_title_id);

                if (!connProfile.location_id) {
                    connProfile.location_id = 1
                }
                const location = await locationHelper.findById(connProfile.location_id);
                   delete connProfile.password
                   return {
                       ...connProfile,
                       job_title: job.job_title,
                       location: location.location
                   }
               } catch (e) {
                   console.log(e)
           }
       }

        async function connRequest(arr) {
            let connRequest
           try {
               connRequest = await userHelper.findById(arr)
                if (!connRequest.job_title_id) {
                     connRequest.job_title_id = 1
                }
                const job = await jobHelper.findById(connRequest.job_title_id);

                if (!connRequest.location_id) {
                    connRequest.location_id = 1
                }
                const location = await locationHelper.findById(connRequest.location_id);
               delete connRequest.password
               if (connRequest.rejected === true) {
                   delete {connRequest}
               } else {
                   return {
                       ...connRequest,
                       job_title: job.job_title,
                       location: location.location
                   }
               }
           } catch (e) {
               console.log(e)
           }
       }

       const getData = async () => {
           const myConnProfileAcc = await Promise.all(myConnsAcc.map(arr => connData(arr.userReq)));
           const myConnProfileReq = await Promise.all(myConnsReq.map(arr => connData(arr.userAcc)))
           const myConnRequest = await Promise.all(myRequests.map(arr => connRequest(arr.userReq)));
           const mySentRequests = await Promise.all(myOutGoingRequests.map(arr => connRequest(arr.userAcc)));

           const myConnProfiles = [];
               myConnProfileAcc.map(arr => {
                   myConnProfiles.push(arr)
                })
               myConnProfileReq.map(arr => {
                   myConnProfiles.push(arr)
                })
           return {
                myConnProfiles,
                myConnRequest,
                mySentRequests
           }
       }

       delete user.password
       getData().then(data => {
           res.status(200).json({
                ...user,
                job_title: job.job_title,
                location: location.location,
                techs: tech_id,
                myConnections: data.myConnProfiles,
                myRequests: data.myConnRequest,
                mySentRequests: data.mySentRequests
           })
       })
   } catch (e) {
       console.log(e);
       next();
   }
});

router.post('/:id',restricted(), async (req, res, next) => {
    try {
        const user_id = req.params.id;
        const validateUser = await userHelper.findById(user_id);
            if (!validateUser) {
                res.status(400).json({
                    errorMessage: 'User ID not found'
                })
            }
        const { techs } = req.body;
            if ( techs ) {
                techs.map((arr) => {
                    techHelper.updateTech(user_id, arr)})
            }
        const { first_name, last_name, bio, email, job_title_id, location_id }  = req.body;
        const data = {
            first_name,
            last_name,
            bio,
            email,
            job_title_id,
            location_id
        }
            if (!data) {
                res.status(400).json({
                    errorMessage: "No data included in request"
                })
            }
        await userHelper.update(user_id, data);
        const user = await userHelper.findById(user_id);
        const job = await jobHelper.findById(user.job_title_id);
        const location = await locationHelper.findById(user.location_id);
        const tech = await techHelper.userTech(user.id);

        const returnedUser = {
            ...user,
            job,
            location,
            tech
        }
        delete returnedUser.password
        res.status(201).json(returnedUser)
    } catch (e) {
        console.log(e)
        next()
    }
});

module.exports = router;
