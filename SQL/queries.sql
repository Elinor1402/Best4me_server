--answers table creation
CREATE TABLE answers (
    id SERIAL PRIMARY KEY,
    answer TEXT NOT NULL
);

--copy from CSV file
\copy answers(id, answer) FROM 'C:/Users/admin/Desktop/HIT/Industry Project/answers.csv' CSV HEADER;

--atoq table creation
CREATE TABLE atoq (
    next_questionid INTEGER NOT NULL,
    answerid INTEGER NOT NULL,
    PRIMARY KEY (next_questionid, answerid)
);

--copy from CSV file
\copy atoq(next_questionid, answerid)
 FROM 'C:/Users/admin/Desktop/HIT/Industry Project/atoq.csv' CSV HEADER;

--q_appearance table creation
CREATE TABLE q_appearance (
    questionid SERIAL PRIMARY KEY,
    answer_type INTEGER
);

--copy from CSV file
\copy q_appearance(questionid, answer
_type) FROM 'C:/Users/admin/Desktop/HIT/Industry Project/q_appearance.csv' CSV HEADER;

--qtoa table creation
CREATE TABLE qtoa (
    answerid INTEGER NOT NULL,
    questionid INTEGER NOT NULL,
    PRIMARY KEY (answerid, questionid)
);

--copy from CSV file
\copy qtoa(answerid, questionid) FROM 'C:/Users/admin/Desktop/HIT/Industry Project/qtoa.csv' CSV HEADER;

--questions table creation
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    page TEXT,
    question TEXT
);

--copy from CSV file
\copy questions(id, page, question) FROM 'C:/Users/admin/Desktop/HIT/Industry Project/questions.csv' CSV HEADER;

--users_answers table creation
CREATE TABLE users_answers (
    user_id INTEGER PRIMARY KEY,
    answers JSONB
);

--users_email table creation
CREATE TABLE users_email (
    user_id INTEGER NOT NULL,
    email TEXT,
    password TEXT,
    company_id INTEGER NOT NULL,
    isdone BOOLEAN,
    email_date TEXT,
    PRIMARY KEY (user_id, company_id)
);

--company_info table creation
CREATE TABLE company_info (
    company_id INTEGER PRIMARY KEY,
    "Email" VARCHAR(255),
    "Password" TEXT,
    "Organizations name" TEXT,
    "Organizations domain" TEXT,
    "Year of establishment" INTEGER,
    "The organization is local or global" TEXT,
    "Branch location" TEXT,
    "Organization size" TEXT
);




