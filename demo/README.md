# Pi Chess Game

A chess game application built on the Pi Network ecosystem. Players can play chess matches and earn Pi coins for winning games.


It is composed of two major parts:

* **backend**: a backend app (a very simple JSON API built using Node and ExpressJS)
* **frontend**: a single-page frontend app (built using React and create-react-app)


## Initial Development

Read [`doc/development.md`](./doc/development.md) to get started and learn how to run this app in development.

> **WARNING**
>
> The demo app uses express session cookies which, in the Sandbox environment, are not correctly saved on the client on some browsers.
> To properly test all of the features of the Demo App, we recommend you to open the sandbox app using Mozilla Firefox.


## Deployment

Read [`doc/deployment.md`](./doc/deployment.md) to learn how to deploy this app on a server using Docker and docker-compose.


## Game Flow

1. Players log in via Pi Authentication (via Pi SDK)
2. Player selects "Play for Pi" mode
3. Both players pay 0.01 Pi using Pi Wallet
4. Match begins after both payments are confirmed
5. Game finishes → result sent to backend
6. Backend verifies and pays winner 0.018 Pi
7. App keeps 0.002 Pi as fee

## Development

Read [development.md](./doc/development.md) to get started and learn how to run this app in development.

## Deployment

Read [deployment.md](./doc/deployment.md) to learn how to deploy this app on a server using Docker and docker-compose.
