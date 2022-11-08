var express = require('express');
var router = express.Router();
var moment = require('moment')
const { isLoggedIn } = require('../helpers/util')
const path = require('path')

module.exports = function (db) {

  router.get('/', isLoggedIn, async function (req, res) {
    try {
      const url = req.url == '/' ? '/users?page=1' : `/users${req.url}`

      //searching
      const queries = []
      const params = []

      if (req.query.name) {
        params.push(req.query.name)
        queries.push(`name ilike '%' || $${params.length} || '%'`)
      }

      if (req.query.startdate && req.query.todate) {
        queries.push(`birthdate between $${params.length + 1} and $${params.length + 2}`)
        params.push(req.query.startdate)
        params.push(req.query.todate)
      }

      const page = req.query.page || 1

      const limit = 3
      const offset = (page - 1) * limit

      let sql = 'SELECT COUNT(*) as total FROM users'
      if (queries.length > 0)
        sql += ` where ${queries.join(' AND ')}`

      const { rows } = await db.query(sql, [...params])
      const total = rows[0].total
      const pages = Math.ceil(total / limit)

      sql = 'SELECT * FROM users'
      if (queries.length > 0)
        sql += ` where ${queries.join(' AND ')}`

      sql += ` limit $${params.length + 1} offset $${params.length + 2}`

      db.query(sql, [...params, limit, offset], (err, { rows }) => {
        if (err) {
          console.log(err)
          return res.send(err)
        }
        res.render('users/list', {
          rows,
          moment,
          pages,
          page,
          query: req.query,
          url,
          user: req.session.user
        })
      })
    } catch (e) {
      console.log(e)
      res.send(e)
    }
  })


  router.get('/add', isLoggedIn, function (req, res) {
    res.render('users/form', { item: {} })
  })

  router.post('/add', isLoggedIn, function (req, res) {
    db.query('INSERT INTO users (name, birthdate) VALUES ($1, $2)', [req.body.name, req.body.birthdate], (err, { rows }) => {
      if (err) return res.send(err)
      res.redirect('/users')
    })
  })

  router.get('/edit/:id', isLoggedIn, function (req, res) {
    const id = req.params.id
    db.query('SELECT * FROM users WHERE id = $1', [id], (err, { rows }) => {
      if (err) return res.send(err)
      if (rows.length == 0) return res.send('data tidak ditemukan')
      res.render('users/form', { item: rows[0], moment })
    })

  })

  router.post('/edit/:id', isLoggedIn, function (req, res) {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    const avatar = req.files.avatar;
    const fileName = `${Date.now()}_${avatar.name}`
    const uploadPath = path.join(__dirname, '..', 'public', 'images', fileName);

    // Use the mv() method to place the file somewhere on your server
    avatar.mv(uploadPath, function (err) {
      if (err)
        return res.status(500).send(err);
      db.query('UPDATE users SET name = $1, birthdate = $2, avatar = $3 WHERE id = $4', [req.body.name, req.body.birthdate, fileName, req.params.id], (err, { rows }) => {
        if (err) return res.send(err)
        res.redirect('/users')
      })
    })
  })

  router.get('/delete/:id', isLoggedIn, function (req, res) {
    db.query('DELETE FROM users WHERE id = $1', [req.params.id], (err) => {
      if (err) return res.send(err)
      res.redirect('/users')
    })
  })


  return router;
}
