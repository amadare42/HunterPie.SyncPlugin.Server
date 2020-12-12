create table LogEntry
(
    Id          int identity
        constraint LogEntry_pk
            primary key nonclustered,
    client_time datetime,
    level       varchar(10),
    msg         varchar(max),
    [user]      varchar(max),
    room        varchar(max),
    server_time datetime,
    seq_number  bigint,
    text        varchar(max)
)
go

create unique index LogEntry_Id_uindex
    on LogEntry (Id)
go

