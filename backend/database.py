import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "interview_trainer.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questions (
        q_id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        difficulty TEXT DEFAULT 'MEDIUM',
        question_text TEXT NOT NULL,
        model_answer TEXT NOT NULL,
        keywords TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        session_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        total_score REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS responses (
        response_id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        q_id INTEGER NOT NULL,
        audio_path TEXT,
        transcript TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id),
        FOREIGN KEY (q_id) REFERENCES questions(q_id)
    );

    CREATE TABLE IF NOT EXISTS nlp_analysis (
        nlp_id INTEGER PRIMARY KEY AUTOINCREMENT,
        response_id INTEGER NOT NULL,
        grammar_score REAL DEFAULT 0,
        relevance_score REAL DEFAULT 0,
        keyword_score REAL DEFAULT 0,
        vocabulary_score REAL DEFAULT 0,
        error_list TEXT DEFAULT '[]',
        FOREIGN KEY (response_id) REFERENCES responses(response_id)
    );

    CREATE TABLE IF NOT EXISTS audio_analysis (
        audio_id INTEGER PRIMARY KEY AUTOINCREMENT,
        response_id INTEGER NOT NULL,
        pitch_mean REAL DEFAULT 0,
        pitch_std REAL DEFAULT 0,
        energy_mean REAL DEFAULT 0,
        speaking_rate REAL DEFAULT 0,
        confidence_score REAL DEFAULT 0,
        confidence_class TEXT DEFAULT 'Medium',
        FOREIGN KEY (response_id) REFERENCES responses(response_id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
        feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
        response_id INTEGER NOT NULL,
        nlp_score REAL DEFAULT 0,
        voice_score REAL DEFAULT 0,
        total_score REAL DEFAULT 0,
        grade TEXT DEFAULT 'C',
        remarks TEXT DEFAULT '',
        recommendations TEXT DEFAULT '[]',
        FOREIGN KEY (response_id) REFERENCES responses(response_id)
    );

    CREATE TABLE IF NOT EXISTS progress_report (
        report_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        week_start TEXT NOT NULL,
        avg_score REAL DEFAULT 0,
        top_strength TEXT DEFAULT '',
        priority_weakness TEXT DEFAULT '',
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
    """)

    # Seed questions
    c.execute("SELECT COUNT(*) FROM questions")
    count = c.fetchone()[0]
    if count == 0:
        seed_questions(c)

    conn.commit()
    conn.close()


def seed_questions(c):
    questions = [
        # HR / Behavioural
        ("HR", "EASY", "Tell me about yourself and your background in Computer Science.",
         "I am a B.Tech Computer Science student with strong foundation in programming, data structures, and software development. I have worked on projects involving web development and machine learning. I am passionate about solving real-world problems using technology and am eager to contribute to a professional environment.",
         "background,experience,skills,projects,passion,programming,computer science"),

        ("HR", "EASY", "What are your greatest strengths and how do they help you professionally?",
         "My greatest strengths include strong problem-solving ability, attention to detail, and good communication skills. I am a quick learner who adapts well to new technologies. My analytical mindset helps me break down complex problems systematically, and I work well both independently and as part of a team.",
         "strengths,problem-solving,communication,analytical,teamwork,adaptable,learning"),

        ("HR", "MEDIUM", "Describe a situation where you faced a challenging problem and how you resolved it.",
         "During my final year project, I encountered a performance bottleneck in the audio processing pipeline. The system was taking over 10 seconds to process each response. I analyzed the code, identified that repeated I/O operations were the bottleneck, implemented caching for processed audio features, and reduced processing time to under 2 seconds. This taught me the importance of profiling before optimizing.",
         "challenge,problem,solution,analysis,teamwork,approach,result,STAR"),

        ("HR", "MEDIUM", "Where do you see yourself in five years?",
         "In five years, I see myself as a skilled software engineer with expertise in machine learning and AI applications. I aim to have contributed meaningfully to impactful projects and taken on technical leadership responsibilities. I plan to continuously upskill in emerging technologies and eventually mentor junior developers.",
         "goals,career,growth,leadership,skills,future,ambition,development"),

        ("HR", "HARD", "Why should we hire you over other candidates?",
         "You should hire me because I bring a unique combination of strong technical skills in ML and software development, demonstrated through my final year project on AI-powered interview training. I have hands-on experience with Python, Flask, React, and machine learning libraries. More importantly, I bring enthusiasm, a problem-solving mindset, and the ability to learn quickly and deliver results under pressure.",
         "skills,experience,unique,value,contribution,technical,differentiation"),

        # Technical - Data Structures
        ("Technical-DSA", "EASY", "What is a linked list and how does it differ from an array?",
         "A linked list is a linear data structure where elements, called nodes, are stored in non-contiguous memory locations. Each node contains data and a pointer to the next node. Unlike arrays, linked lists allow dynamic memory allocation, making insertion and deletion O(1) at known positions. However, random access is O(n) in linked lists compared to O(1) in arrays. Arrays have better cache performance due to contiguous memory.",
         "linked list,node,pointer,array,dynamic,memory,insertion,deletion,O(1),O(n)"),

        ("Technical-DSA", "MEDIUM", "Explain the difference between a stack and a queue with examples.",
         "A stack follows LIFO (Last In First Out) principle. Operations push and pop happen at the top. Real-world example: browser back button, function call stack. A queue follows FIFO (First In First Out) principle. Enqueue adds at the rear and dequeue removes from the front. Real-world example: printer queue, CPU scheduling. Both can be implemented using arrays or linked lists.",
         "stack,queue,LIFO,FIFO,push,pop,enqueue,dequeue,LIFO,FIFO"),

        ("Technical-DSA", "HARD", "Explain binary search trees and their time complexity for operations.",
         "A Binary Search Tree (BST) is a tree where for every node, left subtree values are smaller and right subtree values are larger. Search, insert, and delete operations are O(h) where h is height. For a balanced BST, h = log(n), giving O(log n) operations. In worst case (skewed tree), it degrades to O(n). AVL trees and Red-Black trees maintain balance automatically, ensuring O(log n) in all cases.",
         "BST,binary search tree,O(log n),height,balanced,AVL,insert,search,delete"),

        # Technical - OOP
        ("Technical-OOP", "EASY", "What are the four pillars of Object-Oriented Programming?",
         "The four pillars of OOP are: 1) Encapsulation - bundling data and methods that operate on data within a single unit (class), hiding internal details. 2) Abstraction - hiding complex implementation and showing only necessary features. 3) Inheritance - a class can inherit properties and methods from a parent class, enabling code reuse. 4) Polymorphism - ability of objects to take multiple forms, achieved through method overloading and overriding.",
         "encapsulation,abstraction,inheritance,polymorphism,OOP,class,object,method"),

        ("Technical-OOP", "MEDIUM", "Explain the difference between abstraction and encapsulation.",
         "Abstraction focuses on hiding complexity and showing only essential features to the user. It is achieved using abstract classes and interfaces. Encapsulation focuses on binding data and methods together and restricting direct access using access modifiers like private and public. Example: A car's accelerator abstracts the engine mechanism (abstraction), while the engine internals are hidden and protected (encapsulation). Both work together but serve different purposes.",
         "abstraction,encapsulation,access modifiers,private,public,interface,abstract class"),

        # Technical - DBMS
        ("Technical-DBMS", "EASY", "What is normalization and why is it important in database design?",
         "Normalization is the process of organizing database tables to reduce data redundancy and improve data integrity. It follows normal forms: 1NF eliminates repeating groups, 2NF removes partial dependencies, 3NF eliminates transitive dependencies, and BCNF addresses anomalies. Normalization ensures data consistency, reduces storage requirements, and prevents update, insertion, and deletion anomalies.",
         "normalization,1NF,2NF,3NF,redundancy,data integrity,anomalies,dependency"),

        ("Technical-DBMS", "MEDIUM", "What is the difference between INNER JOIN and LEFT JOIN in SQL?",
         "INNER JOIN returns only rows where there is a match in both tables. If a row in either table has no matching row in the other, it is excluded from the result. LEFT JOIN (or LEFT OUTER JOIN) returns all rows from the left table and matched rows from the right table. If no match exists, NULL values are returned for right table columns. INNER JOIN is more restrictive while LEFT JOIN preserves all left table records.",
         "INNER JOIN,LEFT JOIN,SQL,matching,NULL,tables,outer join,result set"),

        # Technical - OS
        ("Technical-OS", "MEDIUM", "What is a deadlock and what are the necessary conditions for it to occur?",
         "A deadlock is a situation where two or more processes are blocked forever, each waiting for a resource held by another. The four necessary conditions (Coffman conditions) are: 1) Mutual Exclusion - only one process can use a resource at a time. 2) Hold and Wait - a process holds resources while waiting for more. 3) No Preemption - resources cannot be forcibly taken. 4) Circular Wait - a circular chain of processes each waiting for a resource held by the next.",
         "deadlock,mutual exclusion,hold and wait,no preemption,circular wait,Coffman,process,resource"),

        # Technical - Networks
        ("Technical-CN", "MEDIUM", "Explain the difference between TCP and UDP protocols.",
         "TCP (Transmission Control Protocol) is connection-oriented, ensuring reliable, ordered, and error-checked delivery of data. It uses a three-way handshake and guarantees delivery through acknowledgements and retransmission. UDP (User Datagram Protocol) is connectionless and faster but does not guarantee delivery, ordering, or error-checking. TCP is used for web browsing and email; UDP is preferred for video streaming, online gaming, and DNS.",
         "TCP,UDP,connection-oriented,connectionless,reliable,ordered,handshake,streaming"),

        # Technical - ML/AI
        ("Technical-ML", "MEDIUM", "What is overfitting in machine learning and how can it be prevented?",
         "Overfitting occurs when a model learns the training data too well, including noise, and performs poorly on unseen data. It has high training accuracy but low test accuracy. Prevention methods include: 1) Cross-validation to evaluate generalization. 2) Regularization techniques like L1 (Lasso) and L2 (Ridge). 3) Dropout in neural networks. 4) Using more training data. 5) Reducing model complexity. 6) Early stopping during training.",
         "overfitting,generalization,regularization,cross-validation,dropout,L1,L2,training,test"),

        ("Technical-ML", "HARD", "Explain the working of Support Vector Machines (SVM) with kernel functions.",
         "SVM finds an optimal hyperplane that maximizes the margin between two classes. Support vectors are the data points closest to the hyperplane. For non-linearly separable data, kernel functions map data to higher-dimensional space where a linear separator can be found. Common kernels include Linear, Polynomial, and RBF (Radial Basis Function). RBF kernel uses Gaussian function to handle complex boundaries. SVM is effective in high-dimensional spaces and is memory efficient.",
         "SVM,hyperplane,margin,support vectors,kernel,RBF,linear,polynomial,classification"),
    ]

    c.executemany("""
        INSERT INTO questions (category, difficulty, question_text, model_answer, keywords)
        VALUES (?, ?, ?, ?, ?)
    """, questions)
