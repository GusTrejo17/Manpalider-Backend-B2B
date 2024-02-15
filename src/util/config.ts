/**
 * Configuracion para conectar a base de datos
 */
export default {
    /**
     * Configuracion de usuarios maximos 
     */
    poolConfig :{
        min: 0,
        max: 40,
        log: true
    },
    /**
     * configuracion para conectar a nuestra base de datos
     */
    connectionConfig:{
        userName: 'FMB',
        password: 'admin',
        server: '192.168.0.181',
        connectionTimeout: 2 * 60 * 1000,
        requestTimeout: 2 * 60 * 1000,
    },
    database : {
        user: 'FMB',
        password: 'admin',
        server: '192.168.0.181',
        database: 'Handel_B2B_Manpalider',
        //database: 'Handel_B2B_Manpalider_PROD',
        port:1433,
        connectionTimeout: 2 * 60 * 1000,
        requestTimeout: 2 * 60 * 1000,
        pool: {
            max: 100,
            min: 0,
            idleTimeoutMillis:  2 * 60 * 1000,
            evictionRunIntervalMillis:  2 * 60 * 1000,
        },
        options: {
            //encrypt: true,
            encrypt: false,
            enableArithAbort: true
        }
    },
    
}

/**
 * Configuracion para conectar a base de datos
 */
// export default {
//     /**
//      * Configuracion de usuarios maximos 
//      */
//     poolConfig :{
//         min: 0,
//         max: 40,
//         log: true
//     },
//     /**
//      * configuracion para conectar a nuestra base de datos
//      */
//     connectionConfig:{
//         userName: 'sa',
//         password: 'Solutions@2019',
//         // password: 'B1Admin',
//         server: '192.168.0.171',
//         // server: '10.10.15.9',
//         connectionTimeout: 2 * 60 * 1000,
//         requestTimeout: 2 * 60 * 1000,
//     },
//     database : {
//         user: 'sa',
//         password: 'Solutions@2019',
//         // password: 'B1Admin',
//         server: '192.168.0.171',
//         // server: '10.10.15.9',
//         database: 'Handel_B2B',
//         //database: 'Handel-B2B',
//         port:1433,
//         connectionTimeout: 2 * 60 * 1000,
//         requestTimeout: 2 * 60 * 1000,
//         pool: {
//             max: 100,
//             min: 0,
//             idleTimeoutMillis:  2 * 60 * 1000,
//             evictionRunIntervalMillis:  2 * 60 * 1000,
//         },
//         options: {
//             //encrypt: true,
//             encrypt: false,
//             enableArithAbort: true
//         }
//     },
    
// }
