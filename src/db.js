const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to permanent SQLite database at:', dbPath);
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

function initDb() {
  db.serialize(() => {
    // 1. Create subjects table
    db.run(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'code',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create folders table (folders inside subjects)
    db.run(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
      )
    `);

    // 3. Create programs table
    db.run(`
      CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        folder_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        author_name TEXT DEFAULT 'Anonymous',
        language TEXT NOT NULL,
        code TEXT NOT NULL,
        sample_output TEXT,
        tags TEXT DEFAULT '',
        time_complexity TEXT DEFAULT 'O(N)',
        space_complexity TEXT DEFAULT 'O(1)',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `);

    // Migrations for existing databases:
    db.run(`ALTER TABLE programs ADD COLUMN author_name TEXT DEFAULT 'Anonymous'`, (err) => {
      // Safe to ignore duplicate column error on subsequent launches
    });

    db.run(`ALTER TABLE programs ADD COLUMN folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL`, (err) => {
      // Safe to ignore duplicate column error on subsequent launches
    });

    // 3. Seed initial subjects and programs if database is brand new
    db.get('SELECT COUNT(*) as count FROM subjects', (err, row) => {
      if (err) return console.error('Check subjects count error:', err);
      if (row.count === 0) {
        console.log('Seeding initial open-source subjects and programs...');
        seedInitialData();
      } else {
        seedFoldersIfEmpty();
      }
    });
  });
}

function seedInitialData() {
  const seedSubjects = [
    {
      name: 'C Programming',
      description: 'Foundational procedural language for systems, memory management, and pointers.',
      icon: 'file-code',
      programs: [
        {
          title: 'Fibonacci Series (Iterative)',
          description: 'Generates first N terms of Fibonacci sequence using constant space.',
          language: 'c',
          code: `#include <stdio.h>

int main() {
    int n = 10;
    long long first = 0, second = 1, next;

    printf("Fibonacci Series (First %d terms):\\n", n);

    for (int i = 0; i < n; i++) {
        if (i <= 1) {
            next = i;
        } else {
            next = first + second;
            first = second;
            second = next;
        }
        printf("%lld ", next);
    }
    printf("\\n");
    return 0;
}`,
          sample_output: `Fibonacci Series (First 10 terms):
0 1 1 2 3 5 8 13 21 34`,
          tags: 'loops, math, beginner, sequence',
          time_complexity: 'O(N)',
          space_complexity: 'O(1)',
        },
        {
          title: 'Singly Linked List Operations',
          description: 'Implementation of insertion at beginning, traversal, and dynamic node allocation.',
          language: 'c',
          code: `#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node* next;
};

void insertAtHead(struct Node** head_ref, int new_data) {
    struct Node* new_node = (struct Node*)malloc(sizeof(struct Node));
    new_node->data = new_data;
    new_node->next = (*head_ref);
    (*head_ref) = new_node;
}

void printList(struct Node* node) {
    while (node != NULL) {
        printf("%d -> ", node->data);
        node = node->next;
    }
    printf("NULL\\n");
}

int main() {
    struct Node* head = NULL;
    insertAtHead(&head, 30);
    insertAtHead(&head, 20);
    insertAtHead(&head, 10);

    printf("Linked List:\\n");
    printList(head);
    return 0;
}`,
          sample_output: `Linked List:
10 -> 20 -> 30 -> NULL`,
          tags: 'pointers, data-structures, linked-list, memory',
          time_complexity: 'O(1) Insertion',
          space_complexity: 'O(N)',
        },
      ],
    },
    {
      name: 'Python',
      description: 'High-level, expressive scripting language for algorithms, automation, and data.',
      icon: 'terminal',
      programs: [
        {
          title: 'QuickSort Implementation',
          description: 'Divide-and-conquer sorting algorithm using in-place partitioning.',
          language: 'python',
          code: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

# Test run
numbers = [38, 27, 43, 3, 9, 82, 10]
sorted_numbers = quicksort(numbers)
print("Original:", numbers)
print("Sorted:  ", sorted_numbers)`,
          sample_output: `Original: [38, 27, 43, 3, 9, 82, 10]
Sorted:   [3, 9, 10, 27, 38, 43, 82]`,
          tags: 'sorting, algorithms, recursion, divide-conquer',
          time_complexity: 'O(N log N) Avg',
          space_complexity: 'O(log N)',
        },
        {
          title: 'File Word Frequency Counter',
          description: 'Reads text content and counts occurrence of unique words using dictionaries.',
          language: 'python',
          code: `from collections import Counter
import re

text = """
Open source software is code that is designed to be publicly accessible.
Anyone can view, modify, and distribute the code as they see fit.
Open source encourages collaboration and community development.
"""

# Extract words and normalize to lowercase
words = re.findall(r'\\b[a-zA-Z]+\\b', text.lower())
word_counts = Counter(words)

print("Top 5 Most Common Words:")
for word, count in word_counts.most_common(5):
    print(f"  {word.ljust(12)}: {count}")`,
          sample_output: `Top 5 Most Common Words:
  and         : 3
  open        : 2
  source      : 2
  code        : 2
  is          : 2`,
          tags: 'strings, collections, hashmap, text-processing',
          time_complexity: 'O(N)',
          space_complexity: 'O(U) Unique Words',
        },
      ],
    },
    {
      name: 'Data Structures & Algorithms',
      description: 'Abstract data types, complexity analysis, and algorithmic paradigms.',
      icon: 'layers',
      programs: [
        {
          title: 'Binary Search (Iterative)',
          description: 'Searches for target element in sorted array with logarithmic time complexity.',
          language: 'cpp',
          code: `#include <iostream>
#include <vector>

int binarySearch(const std::vector<int>& arr, int target) {
    int low = 0;
    int high = arr.size() - 1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) {
            return mid;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return -1; // Not found
}

int main() {
    std::vector<int> sortedArr = {2, 5, 8, 12, 16, 23, 38, 56, 72, 91};
    int target = 23;

    int index = binarySearch(sortedArr, target);
    if (index != -1) {
        std::cout << "Target " << target << " found at index " << index << "\\n";
    } else {
        std::cout << "Target not found\\n";
    }
    return 0;
}`,
          sample_output: `Target 23 found at index 5`,
          tags: 'search, binary-search, array, logarithmic',
          time_complexity: 'O(log N)',
          space_complexity: 'O(1)',
        },
      ],
    },
    {
      name: 'DBMS (SQL)',
      description: 'Relational database queries, schemas, joins, and aggregations.',
      icon: 'database',
      programs: [
        {
          title: 'Employee Department High Earners (Window Functions)',
          description: 'Finds top 2 highest paid employees in each department using DENSE_RANK().',
          language: 'sql',
          code: `-- Schema Creation
CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    department VARCHAR(50),
    salary DECIMAL(10, 2)
);

-- Window Function Query to find top earners per department
WITH RankedSalaries AS (
    SELECT 
        id,
        name,
        department,
        salary,
        DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank_order
    FROM employees
)
SELECT 
    name,
    department,
    salary,
    rank_order
FROM RankedSalaries
WHERE rank_order <= 2
ORDER BY department, rank_order;`,
          sample_output: `name          department    salary      rank_order
Alice Smith   Engineering   120000.00   1
Bob Jones     Engineering   110000.00   2
Carol White   Marketing     95000.00    1
Dave Brown    Marketing     90000.00    2`,
          tags: 'sql, window-functions, dense-rank, analytics',
          time_complexity: 'O(N log N)',
          space_complexity: 'O(N)',
        },
      ],
    },
    {
      name: 'Java',
      description: 'Object-oriented, platform-independent enterprise programming language.',
      icon: 'coffee',
      programs: [
        {
          title: 'Producer-Consumer with BlockingQueue',
          description: 'Thread-safe concurrent producer-consumer pattern utilizing Java concurrency primitives.',
          language: 'java',
          code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

public class ProducerConsumerDemo {
    public static void main(String[] args) {
        BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(5);

        // Producer Thread
        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    queue.put(i);
                    System.out.println("Produced item: " + i);
                    Thread.sleep(100);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        // Consumer Thread
        Thread consumer = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    Integer item = queue.take();
                    System.out.println("  Consumed item: " + item);
                    Thread.sleep(150);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        producer.start();
        consumer.start();
    }
}`,
          sample_output: `Produced item: 1
  Consumed item: 1
Produced item: 2
Produced item: 3
  Consumed item: 2
Produced item: 4
  Consumed item: 3`,
          tags: 'multithreading, concurrency, blocking-queue, oops',
          time_complexity: 'O(N)',
          space_complexity: 'O(Capacity)',
        },
      ],
    },
  ];

  seedSubjects.forEach((sub) => {
    db.run(
      'INSERT INTO subjects (name, description, icon) VALUES (?, ?, ?)',
      [sub.name, sub.description, sub.icon],
      function (err) {
        if (err) return console.error('Insert subject seed error:', err);
        const subjectId = this.lastID;

        sub.programs.forEach((prog) => {
          db.run(
            `INSERT INTO programs 
             (subject_id, title, description, language, code, sample_output, tags, time_complexity, space_complexity) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              subjectId,
              prog.title,
              prog.description,
              prog.language,
              prog.code,
              prog.sample_output,
              prog.tags,
              prog.time_complexity,
              prog.space_complexity,
            ]
          );
        });
      }
    );
  });
}

function seedFoldersIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM folders', (err, row) => {
    if (err) return console.error('Check folders count error:', err);
    if (!row || row.count <= 1) {
      console.log('Seeding initial subject folders...');
      db.all('SELECT id, name FROM subjects', (subErr, subjects) => {
        if (subErr || !subjects) return;
        const subMap = {};
        subjects.forEach((s) => { subMap[s.name] = s.id; });

        const foldersToSeed = [
          { subject: 'C Programming', name: 'Unit 1: Memory & Pointers', desc: 'Pointer arithmetic, dynamic memory allocation (malloc/free)' },
          { subject: 'C Programming', name: 'Unit 2: Basics & Control Flow', desc: 'Loops, conditionals, math functions, series' },
          { subject: 'Python', name: 'Unit 1: Algorithms & Sorting', desc: 'QuickSort, divide-and-conquer, recursion' },
          { subject: 'Python', name: 'Unit 2: Strings & Text Processing', desc: 'Regular expressions, word counts, dictionary operations' },
          { subject: 'Data Structures & Algorithms', name: 'Unit 1: Searching & Sorting', desc: 'Binary search, divide & conquer, complexity analysis' },
          { subject: 'Java', name: 'Unit 1: Multithreading & Concurrency', desc: 'Threads, producer-consumer pattern, BlockingQueue' },
          { subject: 'DBMS (SQL)', name: 'Unit 1: Advanced Queries & Windows', desc: 'Window functions, partitioning, ranking' },
        ];

        foldersToSeed.forEach((f) => {
          const sId = subMap[f.subject];
          if (sId) {
            db.run(
              'INSERT INTO folders (subject_id, name, description) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM folders WHERE subject_id = ? AND name = ?)',
              [sId, f.name, f.desc, sId, f.name],
              function () {
                // Link seed programs to folders if unassigned
                if (f.name === 'Unit 2: Basics & Control Flow') {
                  db.run('UPDATE programs SET folder_id = (SELECT id FROM folders WHERE name = ? AND subject_id = ?) WHERE title LIKE "%Fibonacci%" AND (folder_id IS NULL OR folder_id = 0)', [f.name, sId]);
                } else if (f.name === 'Unit 1: Memory & Pointers') {
                  db.run('UPDATE programs SET folder_id = (SELECT id FROM folders WHERE name = ? AND subject_id = ?) WHERE (title LIKE "%Linked List%" OR title LIKE "%malloc%") AND (folder_id IS NULL OR folder_id = 0)', [f.name, sId]);
                } else if (f.name === 'Unit 1: Algorithms & Sorting' && f.subject === 'Python') {
                  db.run('UPDATE programs SET folder_id = (SELECT id FROM folders WHERE name = ? AND subject_id = ?) WHERE title LIKE "%QuickSort%" AND (folder_id IS NULL OR folder_id = 0)', [f.name, sId]);
                } else if (f.name === 'Unit 2: Strings & Text Processing') {
                  db.run('UPDATE programs SET folder_id = (SELECT id FROM folders WHERE name = ? AND subject_id = ?) WHERE title LIKE "%Word Frequency%" AND (folder_id IS NULL OR folder_id = 0)', [f.name, sId]);
                } else if (f.name === 'Unit 1: Searching & Sorting' && f.subject === 'Data Structures & Algorithms') {
                  db.run('UPDATE programs SET folder_id = (SELECT id FROM folders WHERE name = ? AND subject_id = ?) WHERE title LIKE "%Binary Search%" AND (folder_id IS NULL OR folder_id = 0)', [f.name, sId]);
                } else if (f.name === 'Unit 1: Multithreading & Concurrency') {
                  db.run('UPDATE programs SET folder_id = (SELECT id FROM folders WHERE name = ? AND subject_id = ?) WHERE title LIKE "%Producer-Consumer%" AND (folder_id IS NULL OR folder_id = 0)', [f.name, sId]);
                } else if (f.name === 'Unit 1: Advanced Queries & Windows') {
                  db.run('UPDATE programs SET folder_id = (SELECT id FROM folders WHERE name = ? AND subject_id = ?) WHERE title LIKE "%Earners%" AND (folder_id IS NULL OR folder_id = 0)', [f.name, sId]);
                }
              }
            );
          }
        });
      });
    }
  });
}

module.exports = {
  db,
  initDb,
  seedFoldersIfEmpty,
};

