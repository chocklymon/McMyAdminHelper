<!DOCTYPE HTML>
<html>
    <head>
        <title>Alert</title>
        <link href="notify.css" rel="stylesheet" type="text/css" />
    </head>
    <body>
        <div class="wrapper">
            <div class="message">
                <?php
                if (isset($_GET['m'])) {
                    echo $_GET['m'];
                } else if (isset($_GET['message'])) {
                    echo $_GET['message'];
                } else {
                    echo "Notification alert";
                }
                ?>
            </div>
        </div>
    </body>
</html>