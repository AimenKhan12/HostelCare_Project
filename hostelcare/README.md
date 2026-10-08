# HostelCare - Smart Hostel Complaint Management System

Real website: residents make complaints, they go to the right staff member automatically, the admin watches everything.
No dummy data. Every account, complaint and notice is real and saved in PostgreSQL.

**Tech:** HTML, CSS, JavaScript (frontend) | Node.js + Express (backend) | PostgreSQL on Neon (database) | JWT login | Vercel (live website)

---

## 1. Folder map (what each file does)

```
hostelcare/
├── index.js            starts the server and connects the routes
├── db.js               database connection (one shared pool = Singleton)
├── auth.js             login check (JWT) and role check
├── config.js           lists: categories, statuses, priorities
├── services.js         auto-assign staff + notification texts (Factory)
├── schema.sql          the 4 database tables (run once in Neon)
├── create-admin.js     makes the first admin account (run once)
├── routes/
│   ├── users.js        signup, login, password, staff add/remove
│   ├── complaints.js   create, list, status, reassign, rating
│   └── extras.js       notice board and notifications
├── public/             the website (what the browser opens)
│   ├── index.html      login page (3 role cards)
│   ├── signup.html     resident sign up
│   ├── dashboard.html  one dashboard for all roles
│   ├── dashboard.js    menus and pages for each role
│   ├── app.js          shared helpers, icons, logo
│   ├── style.css       design and colors (change colors at the top)
│   └── favicon.svg     logo icon
├── package.json        packages list
├── .env.example        example settings (copy to .env)
└── .gitignore          keeps .env and node_modules off GitHub
```
Patterns used: **MVC** (routes = controller, public = view, database = model), **Singleton** (db.js),
**Facade** (POST /api/complaints saves, assigns and notifies in one call), **Factory** (message() in services.js).

---

## 2. Step 1 - Make the database on Neon

1. Go to https://neon.tech and sign up (free). Check their free plan limits when you sign up.
2. Click **Create project**. Name: `hostelcare`. Create it.
3. On the project page click **Connect**. Turn **Connection pooling ON**, and copy the **connection string**.
   It looks like: `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
   Keep it safe. This is your **DATABASE_URL**.
4. In Neon open **SQL Editor**. Open the file `schema.sql` from this project, copy everything, paste it in the editor, press **Run**.
   You will see 4 tables: users, complaints, notifications, notices.

## 3. Step 2 - Run it on your laptop (test first)

1. Install Node.js (version 18 or newer) from https://nodejs.org
2. Open this folder in VS Code. Open Terminal and run: `npm install`
3. Copy `.env.example` and name the copy `.env`. Open `.env` and fill:
   - `DATABASE_URL=` paste your Neon connection string
   - `JWT_SECRET=` any long random text. To make one, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. Make the first admin (change the name, email and password):
   `npm run create-admin -- "Hostel Warden" admin@example.com YourStrongPassword`
5. Start the website: `npm start`  then open http://localhost:3000
6. Log in with the **Admin** card using that email and password.

## 4. Step 3 - First use (how the real system works)

1. **Admin:** go to **Manage Staff** and add staff. Add at least one for each category
   (Electrical, Plumbing, Cleaning, Internet). The admin sets each staff member's email and password.
2. **Staff:** log in with the email and password the admin made (use the **Staff** card).
3. **Residents:** open the site, choose **Resident**, click **Create an account**, fill the form.
4. A resident makes a complaint -> it goes to the staff member of that category with the least open work
   -> admin and staff get a notification -> staff changes the status -> resident gets a notification.
5. Admin can post notices (everyone gets a notification), change the staff of a complaint, and see reports.
6. The pages refresh by themselves every 15 seconds, so new complaints and notifications appear without reloading.

## 5. Step 4 - Put the code on GitHub

1. Make a new repository on https://github.com (private or public).
2. Upload this whole folder (GitHub Desktop or VS Code Source Control).
3. `.gitignore` already protects `.env` and `node_modules`. **Never upload your .env file.**

## 6. Step 5 - Deploy on Vercel

1. Go to https://vercel.com and log in with GitHub.
2. Click **Add New -> Project** and import your `hostelcare` repository.
3. Framework Preset: leave as detected (Express) or choose **Other**. Do not change build settings.
4. Open **Environment Variables** and add these two (same values as your `.env`):
   - `DATABASE_URL` = your Neon connection string
   - `JWT_SECRET` = the same long random text
5. Click **Deploy**. When it finishes, open the link Vercel gives you. Share this link with friends.
6. Your admin account already works, because the Neon database is the same one you used on your laptop.

After any code change: push to GitHub and Vercel deploys again by itself.

---

## 7. If something goes wrong

| Problem | Fix |
|---|---|
| "Server error" or login does nothing | `DATABASE_URL` is wrong or missing. Check it in `.env` (laptop) or Vercel Environment Variables. After changing variables on Vercel, press **Redeploy**. |
| `relation "users" does not exist` | You did not run `schema.sql` in Neon (Step 1, point 4). |
| `Please log in again` all the time | `JWT_SECRET` is missing or different. Set it, then log in again. |
| Admin login says wrong email/password | Run the `create-admin` command again with the correct DATABASE_URL in `.env`. |
| Connection fails | Copy the connection string again from Neon. Do not type it by hand. |
| Vercel shows 404 on the home page | Make sure the folder `public/` and the file `public/index.html` are on GitHub. |
| A friend cannot register | Email already used, or password shorter than 6 characters. |

## 8. If your sir asks for a change

| Change | Where |
|---|---|
| New category (e.g. Carpenter) | `config.js` (CATEGORIES) and `public/app.js` (CATEGORIES). Add its icon in `dashboard.js` (CAT_ICON). |
| New status | `config.js` (STATUSES) and `public/app.js` (STATUSES). |
| New menu item | `public/dashboard.js`: add the name in MENU, then a `case` in `page()`. |
| Change the assignment rule | `services.js`, function `assignStaff`. |
| Change colors | `public/style.css`, the colors at the top (`:root`). |
| New field in a complaint | `schema.sql` (ALTER TABLE), `routes/complaints.js`, and the form in `dashboard.js`. |

## 9. Security in this project

- Passwords are never saved. Only a bcrypt hash is saved.
- Login gives a JWT token (valid 7 days). Every API call checks it.
- Each role is checked on the server (resident / staff / admin), not only on the screen.
- All database queries use `$1, $2` values, so SQL injection is blocked.
- User text is escaped before it is shown on the page.
- The role card must match the account's real role, or login is refused.
