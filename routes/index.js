var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

module.exports = function (db) {

  router.get('/', function (req, res, next) {
    res.render('login', {
      error: req.flash('error'),
      success: req.flash('success')
    });
  });

  router.post('/login', async function (req, res, next) {
    console.log(req.body)
    try {
      const { email, password } = req.body

      const { rows } = await db.query('select * from users where email = $1', [email])

      if (rows.length == 0) throw "email doesn't exist"

      if (!bcrypt.compareSync(password, rows[0].password)) throw "wrong password"

      req.session.user = { userid: rows[0].id, name: rows[0].name }

      res.redirect('/users')

    } catch (err) {
      req.flash('error', err)
      res.redirect('/')
    }
  });

  router.get('/register', function (req, res, next) {
    res.render('register');
  });

  router.post('/register', async function (req, res, next) {
    console.log(req.body)
    try {
      const { email, name, password } = req.body

      const { rows } = await db.query('select * from users where email = $1', [email])

      if (rows.length > 0) throw "email exist"

      const hash = bcrypt.hashSync(password, saltRounds);

      await db.query('insert into users(name, email, password) values($1, $2, $3)', [name, email, hash])

      req.flash('success', 'user created, please login')
      res.redirect('/')

    } catch (err) {
      res.send(err)
    }
  });

  router.get('/logout', function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect('/')
    })
  })

  return router;
}
