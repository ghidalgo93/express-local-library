const async = require("async");
const { body, validationResult } = require("express-validator");
const BookInstance = require("../models/bookinstance");
const Book = require("../models/book");

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, next) {
  BookInstance.find()
    .populate("book")
    .exec((err, list_bookinstances) => {
      if (err) {
        return next(err);
      }
      // Successfu, so render
      res.render("bookinstance_list", {
        title: "Book Instance List",
        bookinstance_list: list_bookinstances,
      });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results.
        var err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("bookinstance_detail", {
        title: `Copy: ${bookinstance.book.title}`,
        bookinstance,
      });
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, "title").exec((err, books) => {
    if (err) {
      return next(err);
    }
    // Successful, so render
    res.render("bookinstance_form", {
      title: "Create Book Instance",
      book_list: books,
    });
  });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate and sanitise fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, "title").exec((err, books) => {
        if (err) {
          return next(err);
        }
        // Successful, so render.
        res.render("bookinstance_form", {
          title: "Create BookInstance",
          book_list: books,
          selected_book: bookinstance.book._id,
          errors: errors.array(),
          bookinstance,
        });
      });
    } else {
      // Data from form is valid.
      bookinstance.save((err) => {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  },
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate("book")
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }
      if (bookinstance == null) {
        // No results
        res.redirect("/catalog/bookinstances");
      }
      // Successfu, so render
      res.render("bookinstance_delete", {
        title: "Delete Book Instance",
        bookinstance,
      });
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res, next) {
  BookInstance.findById(req.body.bookinstanceid)
    .populate("book")
    .exec((err, bookinstance) => {
      if (err) {
        return next(err);
      }
      // No dependent models. Delete object and redirect to the list of instances.
      BookInstance.findByIdAndRemove(req.body.bookinstanceid, (err) => {
        if (err) {
          return next(err);
        }
        // Success - go to the book instance list.
        res.redirect("/catalog/bookinstances");
      });
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res, next) {
  // get book and book instance info for form
  async.parallel(
    {
      bookinstance(callback) {
        BookInstance.findById(req.params.id).exec(callback);
      },
      books(callback) {
        Book.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.bookinstance == null) {
        // no results
        const err = new Error("Book instance not found");
        err.status = 404;
        return next(err);
      }
      // Seccess
      res.render("bookinstance_form", {
        title: "Update Book Instance",
        bookinstance: results.bookinstance,
        book_list: results.books,
      });
    }
  );
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate and sanitise fields.
  body("book", "Book must be specified").trim().isLength({ min: 1 }).escape(),
  body("imprint", "Imprint must be specified")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("status").escape(),
  body("due_back", "Invalid date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back,
      _id: req.params.id, // this is required, or a new id will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      async.parallel(
        {
          bookinstance(callback) {
            BookInstance.findById(req.params.id).exec(callback);
          },
          books(callback) {
            Book.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }
          if (results.bookinstance == null) {
            // no results
            const err = new Error("Book instance not found");
            err.status = 404;
            return next(err);
          }
          // Seccess
          res.render("bookinstance_form", {
            title: "Update Book Instance",
            bookinstance: results.bookinstance,
            book_list: results.books,
          });
        }
      );
    } else {
      // Data from form is valid - update the record.
      BookInstance.findByIdAndUpdate(
        req.params.id,
        bookinstance,
        {},
        (err, theinstance) => {
          if (err) {
            return next(err);
          }
          // Successful - redirect to book instance detail page.
          res.redirect(theinstance.url);
        }
      );
    }
  },
];
