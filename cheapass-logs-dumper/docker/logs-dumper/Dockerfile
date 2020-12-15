FROM alpine

ARG REPO

# installing git & node
RUN apk add git
RUN apk add --update nodejs nodejs-npm

# copy start script
ADD start.sh /
RUN chmod +x /start.sh

# clone repo
RUN git clone ${REPO} app

ENTRYPOINT [ "/start.sh" ]