import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './proto/random';
import { RandomHandlers } from './proto/randomPackage/Random';
import { TodoRequest } from './proto/randomPackage/TodoRequest';
import { ChatRequest } from './proto/randomPackage/ChatRequest';
import { ChatResponse } from './proto/randomPackage/ChatResponse';

const PORT = 8082

const PROTO_FILE = './proto/random.proto'
const packageOf = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))

const grpcObject = (grpc.loadPackageDefinition(packageOf) as unknown) as ProtoGrpcType
const randomPackage = grpcObject.randomPackage

function main() {
  const server = getServer()

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error(error)
      return
    }
    console.log(`You server as started on port ${port}`)
    server.start()
  })
}

const todoList: {
  todos: TodoRequest[] 
} = { todos: [] }

const callObjectByUsername = new Map<string, grpc.ServerDuplexStream<ChatRequest, ChatResponse>>()

function getServer() {
  const server = new grpc.Server()
  server.addService(randomPackage.Random.service, {
    PingPong: (request, response) => {
      console.log(request.request)
      response(null, {
        message: 'Pong'
      })
    },
    RandomNumbers: (call) => {
      const { maxValue } = call.request
      console.log(maxValue)

      let runCount = 0
      const id = setInterval(() => {
        runCount = ++runCount

        if (typeof maxValue === 'undefined') {
          call.write({ number: 0 })
          call.end()
          return
        }

        call.write({ number: Math.floor(Math.random() * maxValue) })

        if (runCount >= 10) {
          clearInterval(id)
          call.end()
        }
      }, 500)
    },
    TodoList: (call, callback) => {
      call.on('data', (chunk: TodoRequest) => {
        todoList.todos.push(chunk)
        console.log(chunk)
      })

      call.on('end', () => {
        callback(null, { toDos: todoList.todos })
      })
    },
    Chat: (call) => {
      call.on('data', (request) => {
        console.log(call.metadata.get('username')[0])
        const username = call.metadata.get('username')[0] as string
        // @ts-ignore
        const message = call.message
        
        console.log(username, request.message)

        for(let [user, usersCall] of callObjectByUsername) {
          console.log(username, user)
          if (username !== user) {
            usersCall.write({
              username,
              message
            })
          }
        }

        if (callObjectByUsername.get('username') === undefined) {
          callObjectByUsername.set(username, call)
        }
      })
      
      call.on('end', () => {
        const username = call.metadata.get('username')[0] as string
        callObjectByUsername.delete(username)
        console.log(`${username} is ending their chat session`)
        call.write({
          username: 'Server',
          message: `See you later ${username}`
        })

        call.end()
      })

      call.on('end', () => {
        const username = call.metadata.get('username')[0] as string
        callObjectByUsername.delete(username)
        for(let [user, usersCall] of callObjectByUsername) {
          if (username !== user) {
            usersCall.write({
              username,
              message: 'Has left the chat'
            })
          }
        }
        call.write({
          username: 'Server',
          message: `See you later ${username}`
        })

        call.end()
      })
    }
  } as RandomHandlers)

  return server
}

main()