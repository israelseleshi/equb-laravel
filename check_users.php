<?php
require __DIR__.'/backend/vendor/autoload.php';
$db = new PDO('sqlite:'.__DIR__.'/backend/database/database.sqlite');
$stmt = $db->query('SELECT role, phone, name FROM users');
foreach ($stmt as $row) {
    echo $row['role'].': '.$row['phone'].' / '.$row['name'].PHP_EOL;
}
