create table mh_logs.LogEntry
(
    Id          int auto_increment
        primary key,
    client_time datetime(3) null,
    level       varchar(10) null,
    msg         text        null,
    user        varchar(30) null,
    room        varchar(30) null,
    server_time datetime(3) null,
    seq_number  bigint      null,
    text        text        null
);
