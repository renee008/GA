// Import the Express.js framework
const express = require('express');

// Create an instance of the Express application. This app variable will be used to define routes and configure the server.
const app = express();

// enable static files
app.use(express.static('public'));

// Specify the port for the server to listen on
const port = 3000;

// include mysql library
const mysql = require('mysql2');

//Include code to set EJS as the view engine
app.set('view engine', 'ejs');

// include multer
const multer = require('multer')

// enable form processing
app.use(express.urlencoded({
    extended: false
}));

// set up multer for file uploads 
const storage = multer.diskStorage ({
    destination: (req,file, cb) => {
        cb(null, 'public/images'); // directory to save uploaded files
    },

    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer ({storage: storage});


// Create a connection to the database
const connection = mysql.createConnection({
    //host: 'localhost',
    //user: 'root',
    //password: 'Republic_C207',
    //database: 'football_checklist'

    host: 'mysql-renee.alwaysdata.net',
    user: 'renee',
    password: 't08010688D@1',
    database: 'renee_mini_project',
});

// Open the MySQL connection
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});


// Define a route to render the EJS template
app.get('/', (req, res) => {
    res.render('index');
});


// Add a new checklist form
app.get('/createchecklist', (req, res) => {
    res.render('createchecklist');

});


// Define a route to handle form submission for creating a checklist
app.post('/createchecklist', upload.single('image'), (req, res) => {
    const { Name, Description, Image } = req.body;

    let image;
    if (req.file) {
        image = req.file.filename; // to save only file name
    } else {
        image = null;
    }

    const sql = 'INSERT INTO checklist (Name, Description, image) VALUES (?, ?, ?)';
    connection.query(sql, [Name, Description, image], (err, results) => {
        if (err) {
            console.error('An error occurred while inserting the checklist:', err);
            res.status(500).send('An error occurred while creating the checklist.');
            return;
        }
        res.redirect('/viewchecklist');
    });
});

// route to retrieve a checklist by id 
app.get('/checklist/:id', (req, res) => {
    // extract the checklist id from the req parameters
    const checklist_ID = req.params.id;
    const sql = `SELECT p.Player_Name AS player_name, t.Name AS team_name, c.Type, cic.numbered, cl.Name AS checklist_name, 
    cic.Image as Image, cl.Checklist_ID, cic.id
    FROM card_in_checklist cic
    LEFT JOIN card c ON cic.card_id = c.card_ID
    LEFT JOIN players p ON cic.player_id = p.player_ID
    LEFT JOIN team t ON cic.team_id = t.Team_ID
    LEFT JOIN checklist cl ON cic.Checklist_ID = cl.Checklist_ID
    WHERE cic.Checklist_ID = ?`

    // fetch data from mySQL based on checklist ID
    connection.query(sql, [checklist_ID], (error, results) => {
        if (error) {
            console.error('Database query error: ', error.message);
            return res.status(500).send('Error retrieving cards by ID');
        }

        // check if any checklist with the given ID was found
        if (results.length > 0) {
            // render HTML page with the checklist data
            console.log(results)
            res.render('checklist', { checklist: results[0], card_in_checklist: results });
        } else {
            // if no checklist with the given ID is found, render a 404 page
            res.status(404).send('No cards in checklist, please add cards before accessing the checklist');
        }
    });
});

// Add a route to view checklist 
app.get('/viewchecklist', (req, res) => {
    const sql = 'SELECT * FROM checklist';

    // Fetch data from MySQL
    connection.query(sql, (error, results) => {
        if (error) {
            console.error("Database query error: ", error.message);
            return res.status(500).send('Error retrieving checklists');
        }

        // Render HTML page with data
        res.render('viewchecklist', { checklist: results });
    });
});

// edit checklist 
app.get('/editchecklist/:id', (req, res) => {
    const checklistId = req.params.id;
    const sql = 'SELECT * FROM checklist WHERE Checklist_ID = ?';

    // fetch data from mySQL based on the checklist ID 
    connection.query(sql, [checklistId], (error, results) => {
        if (error) {
            console.error('Database query error: ', error.message)
            return res.status(500).send('Error retrieving checklist by ID');
        }

        // check if any checklist with the given ID was found
        if (results.length > 0) {
            // render HTML page with the checklist data
            res.render('editchecklist', { checklist: results[0] });
        } else {
            // if no checklist with the given ID was found, render a 404 page
            res.status(404).send('Checklist not found');
        }
    });
});

// update record with the new data provided
app.post('/editchecklist/:id', upload.single('image'), (req, res) => {
    const checklistId = req.params.id;

    // extract checklist data from the req body 
    const { Name, Description } = req.body;

    let image = req.body.currentImage; // retrieve current image filename
    if (req.file) { // if new image is uploaded
        image = req.file.filename; // set image to be new filename
    }
    const sql = 'UPDATE checklist SET Name= ?, Description = ?, image = ? WHERE Checklist_ID = ?';

    // insert new checklist info into database
    connection.query(sql, [Name, Description, image, checklistId], (error, results) => {
        if (error) {
            // handle any error that occurs during the database operation
            console.error("Error updating checklist: ", error);
            res.status(500).send("Error updating checklist");
        } else {
            // send a success response 
            res.redirect('/viewchecklist');
        }
    });
});

// delete checklist 
app.get('/deletechecklist/:id', (req, res) => {
    const checklistId = req.params.id;
    const sql = 'DELETE FROM checklist WHERE checklist_ID = ?';

    connection.query(sql, [checklistId], (error, results) => {
        if (error) {
            // handle any error that occurs during the database operation
            console.error("Error deleting checklist: ", error);
            res.status(500).send("Error deleting checklist");
        } else {
            // send a success response 
            res.redirect('/viewchecklist');
        }
    });
});


// add card
// render the form to add card
app.get('/checklist/:checklist_id/addcard', (req, res) => {
    const checklistId = req.params.checklist_id;

    // Fetch checklist data from database
    connection.query('SELECT Checklist_ID, Name FROM checklist WHERE Checklist_ID = ?', [checklistId], (error1, checklist_results) => {
        if (error1) {
            console.error("Error fetching checklist data: ", error1);
            res.status(500).send("Error fetching checklist data");
            return;
        }

        // fetch team data from database
        connection.query('SELECT Team_ID, Name FROM team', (error2, team_results) => {
            if (error2) {
                console.error("Error fetching team data: ", error2);
                res.status(500).send("Error fetching team data");
                return;
            }

            // fetch player data from database
            connection.query('SELECT Player_ID, Player_Name FROM players', (error3, player_results) => {
                if (error3) {
                    console.error("Error fetching player data: ", error3);
                    res.status(500).send("Error fetching player data");
                    return;
                }

                // fetch player data from database
                connection.query('SELECT card_ID, Type FROM card', (error4, card_results) => {
                    if (error4) {
                        console.error("Error fetching card data: ", error4);
                        res.status(500).send("Error fetching card data");
                        return;
                    }

                    // render and pass all data
                    res.render('addcard', {
                        checklist: checklist_results[0],
                        team: team_results,
                        players: player_results,
                        card: card_results
                    });
                });
            });
        });
    });
});


// handle form submission
app.post('/card', upload.single('image'), (req, res) => {
    // extract card data from req body
    const { Checklist_ID, Team_ID, Player_ID, card_ID, numbered } = req.body;

    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }

    const sql = 'INSERT INTO card_in_checklist (card_ID, Checklist_ID, Player_ID, Team_ID, numbered, Image) VALUES (?,?,?,?,?,?)';

    // insert the card into the database
    connection.query(sql, [card_ID, Checklist_ID, Player_ID, Team_ID, numbered, image], (error, results) => {
        if (error) {
            // handle any error that occurs during the database operation
            console.error("Error adding card: ", error);
            res.status(500).send("Error adding card");
        } else {
            // send a success response
            res.redirect(`/checklist/${Checklist_ID}`);
        }
    });
});

// edit card 
app.get('/editcard/checklist/:checklistId/card/:id', (req, res) => {
    const checklistId = req.params.checklistId;
    const id = req.params.id;

    console.log('Checklist ID:', checklistId);
    console.log('Card ID:', id);

    const sql = `
    SELECT cic.id, cic.Checklist_ID, cic.Player_ID, cic.Team_ID, cic.card_ID, cic.numbered, cic.Image, p.Player_Name AS player_name, t.Name AS team_name, c.Type AS card_type
    FROM card_in_checklist cic
    JOIN players p ON cic.Player_ID = p.Player_ID
    JOIN team t ON cic.Team_ID = t.Team_ID
    JOIN card c ON cic.card_ID = c.card_ID
    WHERE cic.id = ? AND cic.Checklist_ID = ?`;

    // Fetch checklist data from database
    connection.query('SELECT Checklist_ID, Name FROM checklist WHERE Checklist_ID = ?', [checklistId], (error1, checklist_results) => {
        if (error1) {
            console.error("Error fetching checklist data: ", error1);
            res.status(500).send("Error fetching checklist data");
            return;
        }

        // fetch team data from database
        connection.query('SELECT Team_ID, Name FROM team', (error2, team_results) => {
            if (error2) {
                console.error("Error fetching team data: ", error2);
                res.status(500).send("Error fetching team data");
                return;
            }
         
            // fetch player data from database
            connection.query('SELECT Player_ID, Player_Name FROM players', (error3, player_results) => {
                if (error3) {
                    console.error("Error fetching player data: ", error3);
                    res.status(500).send("Error fetching player data");
                    return;
                }

                // fetch card data from database
                connection.query('SELECT card_ID, Type FROM card', (error4, card_results) => {
                    if (error4) {
                        console.error("Error fetching card data: ", error4);
                        res.status(500).send("Error fetching card data");
                        return;
                    }
                    

                    connection.query(sql, [id, checklistId], (error, card_in_checklist_results) => {
                        if (error) {
                            console.error("Error fetching card_in_checklist data: ", error);
                            res.status(500).send("Error fetching card_in_checklist data");
                            return;
                        }

                        // render and pass all data
                        res.render('editcard', {
                            card_in_checklist: card_in_checklist_results[0],
                            checklist: checklist_results[0],
                            team: team_results,
                            players: player_results,
                            card: card_results
                        });
                    });
                });
            });
        });
    });
});


// update record with the new data provided
app.post('/editcard/checklist/:checklistId/card/:id', upload.single('image'), (req, res) => {
    const checklistId = req.params.checklistId;
    const cardId = req.params.id;

    // extract card data from the req body 
    const { Checklist_ID, Team_ID, Player_ID, card_ID, numbered } = req.body;

    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }

    const sql = 'UPDATE card_in_checklist SET Checklist_ID= ?, team_ID = ?, Player_ID = ?, card_ID = ?, numbered =?, image =? WHERE id = ? AND Checklist_ID=?';

    // insert updated card info into database
    connection.query(sql, [Checklist_ID, Team_ID, Player_ID, card_ID, numbered, image, cardId, checklistId], (error, results) => {
        if (error) {
            // handle any error that occurs during the database operation
            console.error("Error updating card: ", error);
            res.status(500).send("Error updating card");
        } else {
            // send a success response 
            res.redirect(`/checklist/${checklistId}`);
        }
    });
});


// delete card 
app.get('/deletecard/checklist/:checklistId/card/:id', (req, res) => {
    const id = req.params.id;
    const checklistId = req.params.checklistId

    const sql = 'DELETE FROM card_in_checklist WHERE id=? AND Checklist_ID=?';
    connection.query(sql, [id,checklistId], (error, results) => {
        if (error) {
            // handle any error that occurs during the database operation
            console.error("Error deleting card: ", error);
            res.status(500).send("Error deleting card");
        } else {
            // send a success response 
            res.redirect(`/checklist/${checklistId}`);
        }
    });
});


// Start the server and listen on the specified port
app.listen(port, () => {
    // Log a message when the server is successfully started
    console.log(`Server is running at http://localhost:${port}`);
});