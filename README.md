Welcome to CthulhuQL, where we hate names that make sense and query Javascript with SQL.

Supported:
    * SELECT * FROM x
    * SELECT col1 FROM x
    * SELECT col1-->'jsonField' FROM x
    * SELECT col1->'jsonField'->>'nestedJsonField' FROM x
    * SELECT * FROM x WHERE y > z AND a > 3 OR b <> c
    * SELECT * FROM x ORDER BY y DESC

Coming Soon:
    * SELECT DISTINCT a, b FROM x
    * SELECT * FROM x GROUP BY x.y
    * SELECT COUNT(*) FROM x
    * SELECT COUNT(a) FROM x
    * SELECT COUNT(DISTINCT a,b) FROM x
    * SELECT SUM(a) FROM x
    * SELECT AVG(a) FROM x
    * Where expressions
    * SELECT a + b AS c FROM x
    * SELECT * FROM (SELECT * FROM z)
    * SELECT * FROM x JOIN y on x.id = y.x_id
    * SELECT * FROM x as y
    * SELECT y.* FROM x as y
    * SELECT * FROM x WHERE y like '%asf%'