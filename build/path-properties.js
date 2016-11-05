// http://geoexamples.com/path-properties/ Version 0.0.1. Copyright 2016 Roger Veciana i Rovira.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.spp = global.spp || {})));
}(this, function (exports) { 'use strict';

	//Parses an SVG path into an object.
	//Taken from https://github.com/jkroso/parse-svg-path
	//Re-written so it can be used with rollup
	var length = {a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0};
	var segment = /([astvzqmhlc])([^astvzqmhlc]*)/ig;

	function parse(path) {
	  var data = [];
		path.replace(segment, function(_, command, args){
			var type = command.toLowerCase();
			args = parseValues(args);

			// overloaded moveTo
			if (type === 'm' && args.length > 2) {
				data.push([command].concat(args.splice(0, 2)));
				type = 'l';
				command = command === 'm' ? 'l' : 'L';
			}

			while (args.length >= 0) {
				if (args.length === length[type]) {
					args.unshift(command);
					return data.push(args);
				}
				if (args.length < length[type]) {
	        throw new Error('malformed path data');
	      }
				data.push([command].concat(args.splice(0, length[type])));
			}
		});
	  return data;
	}

	var number = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/ig;

	function parseValues(args) {
		var numbers = args.match(number);
		return numbers ? numbers.map(Number) : [];
	}

	//Calculate Bezier curve length and positionAtLength
	//Algorithms taken from http://bl.ocks.org/hnakamur/e7efd0602bfc15f66fc5, https://gist.github.com/tunght13488/6744e77c242cc7a94859 and http://stackoverflow.com/questions/11854907/calculate-the-length-of-a-segment-of-a-quadratic-bezier

	function Bezier(ax, ay, bx, by, cx, cy, dx, dy) {
	  return new Bezier$1(ax, ay, bx, by, cx, cy, dx, dy);
	}

	function Bezier$1(ax, ay, bx, by, cx, cy, dx, dy) {
	  this.a = {x:ax, y:ay};
	  this.b = {x:bx, y:by};
	  this.c = {x:cx, y:cy};
	  this.d = {x:dx, y:dy};

	  if(dx && dy){
	    this.getArcLength = getCubicArcLength;
	    this.getPoint = cubicPoint;
	  } else {
	    this.getArcLength = getQuadraticArcLength;
	    this.getPoint = quadraticPoint;
	  }

	  this.init();
	}

	Bezier$1.prototype = {
	  constructor: Bezier$1,
	  init: function() {

	    this.length = this.getArcLength([this.a.x, this.b.x, this.c.x, this.d.x],
	                                    [this.a.y, this.b.y, this.c.y, this.d.y]);
	  },

	  getTotalLength: function() {
	    return this.length;
	  },
	  getPointAtLength: function(length) {
	    var error = 1;
	    var t = length/this.length;

	    while (error > 0.008){

	      var calcLength = this.getArcLength([this.a.x, this.b.x, this.c.x, this.d.x],
	                                      [this.a.y, this.b.y, this.c.y, this.d.y],
	                                    t);
	      error = Math.abs(length - calcLength)/this.length;
	      t = t + (length-calcLength)/this.length;
	    }

	    return this.getPoint([this.a.x, this.b.x, this.c.x, this.d.x],
	                                    [this.a.y, this.b.y, this.c.y, this.d.y],
	                                  t);
	  }
	};

	function quadraticPoint(xs, ys, t){
	  var x = (1 - t) * (1 - t) * xs[0] + 2 * (1 - t) * t * xs[1] + t * t * xs[2];
	  var y = (1 - t) * (1 - t) * ys[0] + 2 * (1 - t) * t * ys[1] + t * t * ys[2];
	  return {x: x, y: y};
	}

	function cubicPoint(xs, ys, t){
	  var x = (1 - t) * (1 - t) * (1 - t) * xs[0] + 3 * (1 - t) * (1 - t) * t * xs[1] +
	  3 * (1 - t) * t * t * xs[2] + t * t * t * xs[3];
	  var y = (1 - t) * (1 - t) * (1 - t) * ys[0] + 3 * (1 - t) * (1 - t) * t * ys[1] +
	  3 * (1 - t) * t * t * ys[2] + t * t * t * ys[3];

	  return {x: x, y: y};
	}

	function getQuadraticArcLength(xs, ys, t) {
	  if (t === undefined) {
	    t = 1;
	  }

	   var ax = xs[0] - 2 * xs[1] + xs[2];
	   var ay = ys[0] - 2 * ys[1] + ys[2];
	   var bx = 2 * xs[1] - 2 * xs[0];
	   var by = 2 * ys[1] - 2 * ys[0];

	   var A = 4 * (ax * ax + ay * ay);
	   var B = 4 * (ax * bx + ay * by);
	   var C = bx * bx + by * by;

	   var b = B/(2*A);
	   var c = C/A;
	   var u = t + b;
	   var k = c - b*b;

	   return (Math.sqrt(A)/2)*(
	     u*Math.sqrt(u*u+k)-b*Math.sqrt(b*b+k)+
	     k*Math.log(Math.abs(
	       (u+Math.sqrt(u*u+k))/(b+Math.sqrt(b*b+k))
	     ))
	   );

	}

	// Legendre-Gauss abscissae (xi values, defined at i=n as the roots of the nth order Legendre polynomial Pn(x))
	var tValues = [
	  [],
	  [],
	  [-0.5773502691896257645091487805019574556476,0.5773502691896257645091487805019574556476],
	  [0,-0.7745966692414833770358530799564799221665,0.7745966692414833770358530799564799221665],
	  [-0.3399810435848562648026657591032446872005,0.3399810435848562648026657591032446872005,-0.8611363115940525752239464888928095050957,0.8611363115940525752239464888928095050957],
	  [0,-0.5384693101056830910363144207002088049672,0.5384693101056830910363144207002088049672,-0.9061798459386639927976268782993929651256,0.9061798459386639927976268782993929651256],
	  [0.6612093864662645136613995950199053470064,-0.6612093864662645136613995950199053470064,-0.2386191860831969086305017216807119354186,0.2386191860831969086305017216807119354186,-0.9324695142031520278123015544939946091347,0.9324695142031520278123015544939946091347],
	  [0, 0.4058451513773971669066064120769614633473,-0.4058451513773971669066064120769614633473,-0.7415311855993944398638647732807884070741,0.7415311855993944398638647732807884070741,-0.9491079123427585245261896840478512624007,0.9491079123427585245261896840478512624007],
	  [-0.1834346424956498049394761423601839806667,0.1834346424956498049394761423601839806667,-0.5255324099163289858177390491892463490419,0.5255324099163289858177390491892463490419,-0.7966664774136267395915539364758304368371,0.7966664774136267395915539364758304368371,-0.9602898564975362316835608685694729904282,0.9602898564975362316835608685694729904282],
	  [0,-0.8360311073266357942994297880697348765441,0.8360311073266357942994297880697348765441,-0.9681602395076260898355762029036728700494,0.9681602395076260898355762029036728700494,-0.3242534234038089290385380146433366085719,0.3242534234038089290385380146433366085719,-0.6133714327005903973087020393414741847857,0.6133714327005903973087020393414741847857],
	  [-0.1488743389816312108848260011297199846175,0.1488743389816312108848260011297199846175,-0.4333953941292471907992659431657841622000,0.4333953941292471907992659431657841622000,-0.6794095682990244062343273651148735757692,0.6794095682990244062343273651148735757692,-0.8650633666889845107320966884234930485275,0.8650633666889845107320966884234930485275,-0.9739065285171717200779640120844520534282,0.9739065285171717200779640120844520534282],
	  [0,-0.2695431559523449723315319854008615246796,0.2695431559523449723315319854008615246796,-0.5190961292068118159257256694586095544802,0.5190961292068118159257256694586095544802,-0.7301520055740493240934162520311534580496,0.7301520055740493240934162520311534580496,-0.8870625997680952990751577693039272666316,0.8870625997680952990751577693039272666316,-0.9782286581460569928039380011228573907714,0.9782286581460569928039380011228573907714],
	  [-0.1252334085114689154724413694638531299833,0.1252334085114689154724413694638531299833,-0.3678314989981801937526915366437175612563,0.3678314989981801937526915366437175612563,-0.5873179542866174472967024189405342803690,0.5873179542866174472967024189405342803690,-0.7699026741943046870368938332128180759849,0.7699026741943046870368938332128180759849,-0.9041172563704748566784658661190961925375,0.9041172563704748566784658661190961925375,-0.9815606342467192506905490901492808229601,0.9815606342467192506905490901492808229601],
	  [0,-0.2304583159551347940655281210979888352115,0.2304583159551347940655281210979888352115,-0.4484927510364468528779128521276398678019,0.4484927510364468528779128521276398678019,-0.6423493394403402206439846069955156500716,0.6423493394403402206439846069955156500716,-0.8015780907333099127942064895828598903056,0.8015780907333099127942064895828598903056,-0.9175983992229779652065478365007195123904,0.9175983992229779652065478365007195123904,-0.9841830547185881494728294488071096110649,0.9841830547185881494728294488071096110649],
	  [-0.1080549487073436620662446502198347476119,0.1080549487073436620662446502198347476119,-0.3191123689278897604356718241684754668342,0.3191123689278897604356718241684754668342,-0.5152486363581540919652907185511886623088,0.5152486363581540919652907185511886623088,-0.6872929048116854701480198030193341375384,0.6872929048116854701480198030193341375384,-0.8272013150697649931897947426503949610397,0.8272013150697649931897947426503949610397,-0.9284348836635735173363911393778742644770,0.9284348836635735173363911393778742644770,-0.9862838086968123388415972667040528016760,0.9862838086968123388415972667040528016760],
	  [0,-0.2011940939974345223006283033945962078128,0.2011940939974345223006283033945962078128,-0.3941513470775633698972073709810454683627,0.3941513470775633698972073709810454683627,-0.5709721726085388475372267372539106412383,0.5709721726085388475372267372539106412383,-0.7244177313601700474161860546139380096308,0.7244177313601700474161860546139380096308,-0.8482065834104272162006483207742168513662,0.8482065834104272162006483207742168513662,-0.9372733924007059043077589477102094712439,0.9372733924007059043077589477102094712439,-0.9879925180204854284895657185866125811469,0.9879925180204854284895657185866125811469],
	  [-0.0950125098376374401853193354249580631303,0.0950125098376374401853193354249580631303,-0.2816035507792589132304605014604961064860,0.2816035507792589132304605014604961064860,-0.4580167776572273863424194429835775735400,0.4580167776572273863424194429835775735400,-0.6178762444026437484466717640487910189918,0.6178762444026437484466717640487910189918,-0.7554044083550030338951011948474422683538,0.7554044083550030338951011948474422683538,-0.8656312023878317438804678977123931323873,0.8656312023878317438804678977123931323873,-0.9445750230732325760779884155346083450911,0.9445750230732325760779884155346083450911,-0.9894009349916499325961541734503326274262,0.9894009349916499325961541734503326274262],
	  [0,-0.1784841814958478558506774936540655574754,0.1784841814958478558506774936540655574754,-0.3512317634538763152971855170953460050405,0.3512317634538763152971855170953460050405,-0.5126905370864769678862465686295518745829,0.5126905370864769678862465686295518745829,-0.6576711592166907658503022166430023351478,0.6576711592166907658503022166430023351478,-0.7815140038968014069252300555204760502239,0.7815140038968014069252300555204760502239,-0.8802391537269859021229556944881556926234,0.8802391537269859021229556944881556926234,-0.9506755217687677612227169578958030214433,0.9506755217687677612227169578958030214433,-0.9905754753144173356754340199406652765077,0.9905754753144173356754340199406652765077],
	  [-0.0847750130417353012422618529357838117333,0.0847750130417353012422618529357838117333,-0.2518862256915055095889728548779112301628,0.2518862256915055095889728548779112301628,-0.4117511614628426460359317938330516370789,0.4117511614628426460359317938330516370789,-0.5597708310739475346078715485253291369276,0.5597708310739475346078715485253291369276,-0.6916870430603532078748910812888483894522,0.6916870430603532078748910812888483894522,-0.8037049589725231156824174550145907971032,0.8037049589725231156824174550145907971032,-0.8926024664975557392060605911271455154078,0.8926024664975557392060605911271455154078,-0.9558239495713977551811958929297763099728,0.9558239495713977551811958929297763099728,-0.9915651684209309467300160047061507702525,0.9915651684209309467300160047061507702525],
	  [0,-0.1603586456402253758680961157407435495048,0.1603586456402253758680961157407435495048,-0.3165640999636298319901173288498449178922,0.3165640999636298319901173288498449178922,-0.4645707413759609457172671481041023679762,0.4645707413759609457172671481041023679762,-0.6005453046616810234696381649462392798683,0.6005453046616810234696381649462392798683,-0.7209661773352293786170958608237816296571,0.7209661773352293786170958608237816296571,-0.8227146565371428249789224867127139017745,0.8227146565371428249789224867127139017745,-0.9031559036148179016426609285323124878093,0.9031559036148179016426609285323124878093,-0.9602081521348300308527788406876515266150,0.9602081521348300308527788406876515266150,-0.9924068438435844031890176702532604935893,0.9924068438435844031890176702532604935893],
	  [-0.0765265211334973337546404093988382110047,0.0765265211334973337546404093988382110047,-0.2277858511416450780804961953685746247430,0.2277858511416450780804961953685746247430,-0.3737060887154195606725481770249272373957,0.3737060887154195606725481770249272373957,-0.5108670019508270980043640509552509984254,0.5108670019508270980043640509552509984254,-0.6360536807265150254528366962262859367433,0.6360536807265150254528366962262859367433,-0.7463319064601507926143050703556415903107,0.7463319064601507926143050703556415903107,-0.8391169718222188233945290617015206853296,0.8391169718222188233945290617015206853296,-0.9122344282513259058677524412032981130491,0.9122344282513259058677524412032981130491,-0.9639719272779137912676661311972772219120,0.9639719272779137912676661311972772219120,-0.9931285991850949247861223884713202782226,0.9931285991850949247861223884713202782226],
	  [0,-0.1455618541608950909370309823386863301163,0.1455618541608950909370309823386863301163,-0.2880213168024010966007925160646003199090,0.2880213168024010966007925160646003199090,-0.4243421202074387835736688885437880520964,0.4243421202074387835736688885437880520964,-0.5516188358872198070590187967243132866220,0.5516188358872198070590187967243132866220,-0.6671388041974123193059666699903391625970,0.6671388041974123193059666699903391625970,-0.7684399634756779086158778513062280348209,0.7684399634756779086158778513062280348209,-0.8533633645833172836472506385875676702761,0.8533633645833172836472506385875676702761,-0.9200993341504008287901871337149688941591,0.9200993341504008287901871337149688941591,-0.9672268385663062943166222149076951614246,0.9672268385663062943166222149076951614246,-0.9937521706203895002602420359379409291933,0.9937521706203895002602420359379409291933],
	  [-0.0697392733197222212138417961186280818222,0.0697392733197222212138417961186280818222,-0.2078604266882212854788465339195457342156,0.2078604266882212854788465339195457342156,-0.3419358208920842251581474204273796195591,0.3419358208920842251581474204273796195591,-0.4693558379867570264063307109664063460953,0.4693558379867570264063307109664063460953,-0.5876404035069115929588769276386473488776,0.5876404035069115929588769276386473488776,-0.6944872631866827800506898357622567712673,0.6944872631866827800506898357622567712673,-0.7878168059792081620042779554083515213881,0.7878168059792081620042779554083515213881,-0.8658125777203001365364256370193787290847,0.8658125777203001365364256370193787290847,-0.9269567721871740005206929392590531966353,0.9269567721871740005206929392590531966353,-0.9700604978354287271239509867652687108059,0.9700604978354287271239509867652687108059,-0.9942945854823992920730314211612989803930,0.9942945854823992920730314211612989803930],
	  [0,-0.1332568242984661109317426822417661370104,0.1332568242984661109317426822417661370104,-0.2641356809703449305338695382833096029790,0.2641356809703449305338695382833096029790,-0.3903010380302908314214888728806054585780,0.3903010380302908314214888728806054585780,-0.5095014778460075496897930478668464305448,0.5095014778460075496897930478668464305448,-0.6196098757636461563850973116495956533871,0.6196098757636461563850973116495956533871,-0.7186613631319501944616244837486188483299,0.7186613631319501944616244837486188483299,-0.8048884016188398921511184069967785579414,0.8048884016188398921511184069967785579414,-0.8767523582704416673781568859341456716389,0.8767523582704416673781568859341456716389,-0.9329710868260161023491969890384229782357,0.9329710868260161023491969890384229782357,-0.9725424712181152319560240768207773751816,0.9725424712181152319560240768207773751816,-0.9947693349975521235239257154455743605736,0.9947693349975521235239257154455743605736],
	  [-0.0640568928626056260850430826247450385909,0.0640568928626056260850430826247450385909,-0.1911188674736163091586398207570696318404,0.1911188674736163091586398207570696318404,-0.3150426796961633743867932913198102407864,0.3150426796961633743867932913198102407864,-0.4337935076260451384870842319133497124524,0.4337935076260451384870842319133497124524,-0.5454214713888395356583756172183723700107,0.5454214713888395356583756172183723700107,-0.6480936519369755692524957869107476266696,0.6480936519369755692524957869107476266696,-0.7401241915785543642438281030999784255232,0.7401241915785543642438281030999784255232,-0.8200019859739029219539498726697452080761,0.8200019859739029219539498726697452080761,-0.8864155270044010342131543419821967550873,0.8864155270044010342131543419821967550873,-0.9382745520027327585236490017087214496548,0.9382745520027327585236490017087214496548,-0.9747285559713094981983919930081690617411,0.9747285559713094981983919930081690617411,-0.9951872199970213601799974097007368118745,0.9951872199970213601799974097007368118745]
	];

	// Legendre-Gauss weights (wi values, defined by a function linked to in the Bezier primer article)
	var cValues = [
	  [],[],
	  [1.0,1.0],
	  [0.8888888888888888888888888888888888888888,0.5555555555555555555555555555555555555555,0.5555555555555555555555555555555555555555],
	  [0.6521451548625461426269360507780005927646,0.6521451548625461426269360507780005927646,0.3478548451374538573730639492219994072353,0.3478548451374538573730639492219994072353],
	  [0.5688888888888888888888888888888888888888,0.4786286704993664680412915148356381929122,0.4786286704993664680412915148356381929122,0.2369268850561890875142640407199173626432,0.2369268850561890875142640407199173626432],
	  [0.3607615730481386075698335138377161116615,0.3607615730481386075698335138377161116615,0.4679139345726910473898703439895509948116,0.4679139345726910473898703439895509948116,0.1713244923791703450402961421727328935268,0.1713244923791703450402961421727328935268],
	  [0.4179591836734693877551020408163265306122,0.3818300505051189449503697754889751338783,0.3818300505051189449503697754889751338783,0.2797053914892766679014677714237795824869,0.2797053914892766679014677714237795824869,0.1294849661688696932706114326790820183285,0.1294849661688696932706114326790820183285],
	  [0.3626837833783619829651504492771956121941,0.3626837833783619829651504492771956121941,0.3137066458778872873379622019866013132603,0.3137066458778872873379622019866013132603,0.2223810344533744705443559944262408844301,0.2223810344533744705443559944262408844301,0.1012285362903762591525313543099621901153,0.1012285362903762591525313543099621901153],
	  [0.3302393550012597631645250692869740488788,0.1806481606948574040584720312429128095143,0.1806481606948574040584720312429128095143,0.0812743883615744119718921581105236506756,0.0812743883615744119718921581105236506756,0.3123470770400028400686304065844436655987,0.3123470770400028400686304065844436655987,0.2606106964029354623187428694186328497718,0.2606106964029354623187428694186328497718],
	  [0.2955242247147528701738929946513383294210,0.2955242247147528701738929946513383294210,0.2692667193099963550912269215694693528597,0.2692667193099963550912269215694693528597,0.2190863625159820439955349342281631924587,0.2190863625159820439955349342281631924587,0.1494513491505805931457763396576973324025,0.1494513491505805931457763396576973324025,0.0666713443086881375935688098933317928578,0.0666713443086881375935688098933317928578],
	  [0.2729250867779006307144835283363421891560,0.2628045445102466621806888698905091953727,0.2628045445102466621806888698905091953727,0.2331937645919904799185237048431751394317,0.2331937645919904799185237048431751394317,0.1862902109277342514260976414316558916912,0.1862902109277342514260976414316558916912,0.1255803694649046246346942992239401001976,0.1255803694649046246346942992239401001976,0.0556685671161736664827537204425485787285,0.0556685671161736664827537204425485787285],
	  [0.2491470458134027850005624360429512108304,0.2491470458134027850005624360429512108304,0.2334925365383548087608498989248780562594,0.2334925365383548087608498989248780562594,0.2031674267230659217490644558097983765065,0.2031674267230659217490644558097983765065,0.1600783285433462263346525295433590718720,0.1600783285433462263346525295433590718720,0.1069393259953184309602547181939962242145,0.1069393259953184309602547181939962242145,0.0471753363865118271946159614850170603170,0.0471753363865118271946159614850170603170],
	  [0.2325515532308739101945895152688359481566,0.2262831802628972384120901860397766184347,0.2262831802628972384120901860397766184347,0.2078160475368885023125232193060527633865,0.2078160475368885023125232193060527633865,0.1781459807619457382800466919960979955128,0.1781459807619457382800466919960979955128,0.1388735102197872384636017768688714676218,0.1388735102197872384636017768688714676218,0.0921214998377284479144217759537971209236,0.0921214998377284479144217759537971209236,0.0404840047653158795200215922009860600419,0.0404840047653158795200215922009860600419],
	  [0.2152638534631577901958764433162600352749,0.2152638534631577901958764433162600352749,0.2051984637212956039659240656612180557103,0.2051984637212956039659240656612180557103,0.1855383974779378137417165901251570362489,0.1855383974779378137417165901251570362489,0.1572031671581935345696019386238421566056,0.1572031671581935345696019386238421566056,0.1215185706879031846894148090724766259566,0.1215185706879031846894148090724766259566,0.0801580871597602098056332770628543095836,0.0801580871597602098056332770628543095836,0.0351194603317518630318328761381917806197,0.0351194603317518630318328761381917806197],
	  [0.2025782419255612728806201999675193148386,0.1984314853271115764561183264438393248186,0.1984314853271115764561183264438393248186,0.1861610000155622110268005618664228245062,0.1861610000155622110268005618664228245062,0.1662692058169939335532008604812088111309,0.1662692058169939335532008604812088111309,0.1395706779261543144478047945110283225208,0.1395706779261543144478047945110283225208,0.1071592204671719350118695466858693034155,0.1071592204671719350118695466858693034155,0.0703660474881081247092674164506673384667,0.0703660474881081247092674164506673384667,0.0307532419961172683546283935772044177217,0.0307532419961172683546283935772044177217],
	  [0.1894506104550684962853967232082831051469,0.1894506104550684962853967232082831051469,0.1826034150449235888667636679692199393835,0.1826034150449235888667636679692199393835,0.1691565193950025381893120790303599622116,0.1691565193950025381893120790303599622116,0.1495959888165767320815017305474785489704,0.1495959888165767320815017305474785489704,0.1246289712555338720524762821920164201448,0.1246289712555338720524762821920164201448,0.0951585116824927848099251076022462263552,0.0951585116824927848099251076022462263552,0.0622535239386478928628438369943776942749,0.0622535239386478928628438369943776942749,0.0271524594117540948517805724560181035122,0.0271524594117540948517805724560181035122],
	  [0.1794464703562065254582656442618856214487,0.1765627053669926463252709901131972391509,0.1765627053669926463252709901131972391509,0.1680041021564500445099706637883231550211,0.1680041021564500445099706637883231550211,0.1540457610768102880814315948019586119404,0.1540457610768102880814315948019586119404,0.1351363684685254732863199817023501973721,0.1351363684685254732863199817023501973721,0.1118838471934039710947883856263559267358,0.1118838471934039710947883856263559267358,0.0850361483171791808835353701910620738504,0.0850361483171791808835353701910620738504,0.0554595293739872011294401653582446605128,0.0554595293739872011294401653582446605128,0.0241483028685479319601100262875653246916,0.0241483028685479319601100262875653246916],
	  [0.1691423829631435918406564701349866103341,0.1691423829631435918406564701349866103341,0.1642764837458327229860537764659275904123,0.1642764837458327229860537764659275904123,0.1546846751262652449254180038363747721932,0.1546846751262652449254180038363747721932,0.1406429146706506512047313037519472280955,0.1406429146706506512047313037519472280955,0.1225552067114784601845191268002015552281,0.1225552067114784601845191268002015552281,0.1009420441062871655628139849248346070628,0.1009420441062871655628139849248346070628,0.0764257302548890565291296776166365256053,0.0764257302548890565291296776166365256053,0.0497145488949697964533349462026386416808,0.0497145488949697964533349462026386416808,0.0216160135264833103133427102664524693876,0.0216160135264833103133427102664524693876],
	  [0.1610544498487836959791636253209167350399,0.1589688433939543476499564394650472016787,0.1589688433939543476499564394650472016787,0.1527660420658596667788554008976629984610,0.1527660420658596667788554008976629984610,0.1426067021736066117757461094419029724756,0.1426067021736066117757461094419029724756,0.1287539625393362276755157848568771170558,0.1287539625393362276755157848568771170558,0.1115666455473339947160239016817659974813,0.1115666455473339947160239016817659974813,0.0914900216224499994644620941238396526609,0.0914900216224499994644620941238396526609,0.0690445427376412265807082580060130449618,0.0690445427376412265807082580060130449618,0.0448142267656996003328381574019942119517,0.0448142267656996003328381574019942119517,0.0194617882297264770363120414644384357529,0.0194617882297264770363120414644384357529],
	  [0.1527533871307258506980843319550975934919,0.1527533871307258506980843319550975934919,0.1491729864726037467878287370019694366926,0.1491729864726037467878287370019694366926,0.1420961093183820513292983250671649330345,0.1420961093183820513292983250671649330345,0.1316886384491766268984944997481631349161,0.1316886384491766268984944997481631349161,0.1181945319615184173123773777113822870050,0.1181945319615184173123773777113822870050,0.1019301198172404350367501354803498761666,0.1019301198172404350367501354803498761666,0.0832767415767047487247581432220462061001,0.0832767415767047487247581432220462061001,0.0626720483341090635695065351870416063516,0.0626720483341090635695065351870416063516,0.0406014298003869413310399522749321098790,0.0406014298003869413310399522749321098790,0.0176140071391521183118619623518528163621,0.0176140071391521183118619623518528163621],
	  [0.1460811336496904271919851476833711882448,0.1445244039899700590638271665537525436099,0.1445244039899700590638271665537525436099,0.1398873947910731547221334238675831108927,0.1398873947910731547221334238675831108927,0.1322689386333374617810525744967756043290,0.1322689386333374617810525744967756043290,0.1218314160537285341953671771257335983563,0.1218314160537285341953671771257335983563,0.1087972991671483776634745780701056420336,0.1087972991671483776634745780701056420336,0.0934444234560338615532897411139320884835,0.0934444234560338615532897411139320884835,0.0761001136283793020170516533001831792261,0.0761001136283793020170516533001831792261,0.0571344254268572082836358264724479574912,0.0571344254268572082836358264724479574912,0.0369537897708524937999506682993296661889,0.0369537897708524937999506682993296661889,0.0160172282577743333242246168584710152658,0.0160172282577743333242246168584710152658],
	  [0.1392518728556319933754102483418099578739,0.1392518728556319933754102483418099578739,0.1365414983460151713525738312315173965863,0.1365414983460151713525738312315173965863,0.1311735047870623707329649925303074458757,0.1311735047870623707329649925303074458757,0.1232523768105124242855609861548144719594,0.1232523768105124242855609861548144719594,0.1129322960805392183934006074217843191142,0.1129322960805392183934006074217843191142,0.1004141444428809649320788378305362823508,0.1004141444428809649320788378305362823508,0.0859416062170677274144436813727028661891,0.0859416062170677274144436813727028661891,0.0697964684245204880949614189302176573987,0.0697964684245204880949614189302176573987,0.0522933351526832859403120512732112561121,0.0522933351526832859403120512732112561121,0.0337749015848141547933022468659129013491,0.0337749015848141547933022468659129013491,0.0146279952982722006849910980471854451902,0.0146279952982722006849910980471854451902],
	  [0.1336545721861061753514571105458443385831,0.1324620394046966173716424647033169258050,0.1324620394046966173716424647033169258050,0.1289057221880821499785953393997936532597,0.1289057221880821499785953393997936532597,0.1230490843067295304675784006720096548158,0.1230490843067295304675784006720096548158,0.1149966402224113649416435129339613014914,0.1149966402224113649416435129339613014914,0.1048920914645414100740861850147438548584,0.1048920914645414100740861850147438548584,0.0929157660600351474770186173697646486034,0.0929157660600351474770186173697646486034,0.0792814117767189549228925247420432269137,0.0792814117767189549228925247420432269137,0.0642324214085258521271696151589109980391,0.0642324214085258521271696151589109980391,0.0480376717310846685716410716320339965612,0.0480376717310846685716410716320339965612,0.0309880058569794443106942196418845053837,0.0309880058569794443106942196418845053837,0.0134118594871417720813094934586150649766,0.0134118594871417720813094934586150649766],
	  [0.1279381953467521569740561652246953718517,0.1279381953467521569740561652246953718517,0.1258374563468282961213753825111836887264,0.1258374563468282961213753825111836887264,0.1216704729278033912044631534762624256070,0.1216704729278033912044631534762624256070,0.1155056680537256013533444839067835598622,0.1155056680537256013533444839067835598622,0.1074442701159656347825773424466062227946,0.1074442701159656347825773424466062227946,0.0976186521041138882698806644642471544279,0.0976186521041138882698806644642471544279,0.0861901615319532759171852029837426671850,0.0861901615319532759171852029837426671850,0.0733464814110803057340336152531165181193,0.0733464814110803057340336152531165181193,0.0592985849154367807463677585001085845412,0.0592985849154367807463677585001085845412,0.0442774388174198061686027482113382288593,0.0442774388174198061686027482113382288593,0.0285313886289336631813078159518782864491,0.0285313886289336631813078159518782864491,0.0123412297999871995468056670700372915759,0.0123412297999871995468056670700372915759]
	];

	// LUT for binomial coefficient arrays per curve order 'n'
	var binomialCoefficients = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1]];

	// Look up what the binomial coefficient is for pair {n,k}
	function binomials(n, k) {
	  return binomialCoefficients[n][k];
	}

	/**
	 * Compute the curve derivative (hodograph) at t.
	 */
	function getDerivative(derivative, t, vs) {
	  // the derivative of any 't'-less function is zero.
	  var n = vs.length - 1,
	      _vs,
	      value,
	      k;
	  if (n === 0) {
	    return 0;
	  }

	  // direct values? compute!
	  if (derivative === 0) {
	    value = 0;
	    for (k = 0; k <= n; k++) {
	      value += binomials(n, k) * Math.pow(1 - t, n - k) * Math.pow(t, k) * vs[k];
	    }
	    return value;
	  } else {
	    // Still some derivative? go down one order, then try
	    // for the lower order curve's.
	    _vs = new Array(n);
	    for (k = 0; k < n; k++) {
	      _vs[k] = n * (vs[k + 1] - vs[k]);
	    }
	    return getDerivative(derivative - 1, t, _vs);
	  }
	}

	function B(xs, ys, t) {
	  var xbase = getDerivative(1, t, xs);
	  var ybase = getDerivative(1, t, ys);
	  var combined = xbase * xbase + ybase * ybase;
	  return Math.sqrt(combined);
	}

	function getCubicArcLength(xs, ys, t) {
	  var z, sum, i, correctedT;

	  /*if (xs.length >= tValues.length) {
	    throw new Error('too high n bezier');
	  }*/

	  if (t === undefined) {
	    t = 1;
	  }
	  var n = 20;

	  z = t / 2;
	  sum = 0;
	  for (i = 0; i < n; i++) {
	    correctedT = z * tValues[n][i] + z;
	    sum += cValues[n][i] * B(xs, ys, correctedT);
	  }
	  return z * sum;
	}

	function LinearPosition(x0, x1, y0, y1) {
	  return new LinearPosition$1(x0, x1, y0, y1);

	}

	function LinearPosition$1(x0, x1, y0, y1){
	  this.x0 = x0;
	  this.x1 = x1;
	  this.y0 = y0;
	  this.y1 = y1;
	}

	LinearPosition$1.prototype.getTotalLength = function(){
	  return Math.sqrt(Math.pow(this.x0 - this.x1, 2) +
	         Math.pow(this.y0 - this.y1, 2));
	};

	LinearPosition$1.prototype.getPointAtLength = function(pos){
	  var fraction = pos/ (Math.sqrt(Math.pow(this.x0 - this.x1, 2) +
	         Math.pow(this.y0 - this.y1, 2)));

	  var newDeltaX = (this.x1 - this.x0)*fraction;
	  var newDeltaY = (this.y1 - this.y0)*fraction;
	  return { x: this.x0 + newDeltaX, y: this.y0 + newDeltaY };
	};

	function pathProperties(svgString) {
	  var length = 0;
	  var partial_lengths = [];
	  var functions = [];

	  function svgProperties(string){
	    var parsed = parse(string);
	    var cur = [0, 0];
	    var prev_point = [0, 0];
	    var curve;
	    for (var i = 0; i < parsed.length; i++){
	      //moveTo
	      if(parsed[i][0] === "M"){
	        cur = [parsed[i][1], parsed[i][2]];
	        functions.push(null);
	      } else if(parsed[i][0] === "m"){
	        cur = [parsed[i][1] + cur[0], parsed[i][2] + cur[1]];
	        functions.push(null);
	      }
	      //lineTo
	      else if(parsed[i][0] === "L"){
	        length = length + Math.sqrt(Math.pow(cur[0] - parsed[i][1], 2) + Math.pow(cur[1] - parsed[i][2], 2));
	        functions.push(new LinearPosition(cur[0], parsed[i][1], cur[1], parsed[i][2]));
	        cur = [parsed[i][1], parsed[i][2]];

	      } else if(parsed[i][0] === "l"){
	        length = length + Math.sqrt(Math.pow(parsed[i][1], 2) + Math.pow(parsed[i][2], 2));
	        cur = [parsed[i][1] + cur[0], parsed[i][2] + cur[1]];
	        functions.push();
	      } else if(parsed[i][0] === "H"){
	        length = length + Math.abs(cur[0] - parsed[i][1]);
	        functions.push(new LinearPosition(cur[0], parsed[i][1], cur[1], cur[1]));
	        cur[0] = parsed[i][1];
	      } else if(parsed[i][0] === "h"){
	        length = length + Math.abs(parsed[i][1]);
	        functions.push(new LinearPosition(cur[0], cur[0] + parsed[i][1], cur[1], cur[1]));
	        cur[0] = parsed[i][1] + cur[0];
	      } else if(parsed[i][0] === "V"){
	        length = length + Math.abs(cur[1] - parsed[i][1]);
	        functions.push(new LinearPosition(cur[0], cur[0], cur[1], parsed[i][1]));
	        cur[1] = parsed[i][1];
	      } else if(parsed[i][0] === "v"){
	        length = length + Math.abs(parsed[i][1]);
	        functions.push(new LinearPosition(cur[0], cur[0], cur[1], cur[1] + parsed[i][1]));
	        cur[1] = parsed[i][1] + cur[1];
	        functions.push();
	      //Close path
	      }  else if(parsed[i][0] === "z" || parsed[i][0] === "Z"){
	        length = length + Math.sqrt(Math.pow(parsed[0][1] - cur[0], 2) + Math.pow(parsed[0][2] - cur[1], 2));
	        functions.push(new LinearPosition(cur[0], parsed[0][1], cur[1], parsed[0][2]));
	        cur = [parsed[0][1], parsed[0][2]];
	      }
	      //Cubic Bezier curves
	      else if(parsed[i][0] === "C"){
	        curve = new Bezier(cur[0], cur[1] , parsed[i][1], parsed[i][2] , parsed[i][3], parsed[i][4] , parsed[i][5], parsed[i][6]);
	        length = length + curve.getTotalLength();
	        cur = [parsed[i][5], parsed[i][6]];
	        functions.push(curve);
	      } else if(parsed[i][0] === "c"){
	        curve = new Bezier(cur[0], cur[1] , cur[0] + parsed[i][1], cur[1] + parsed[i][2] , cur[0] + parsed[i][3], cur[1] + parsed[i][4] , cur[0] + parsed[i][5], cur[1] + parsed[i][6]);
	        length = length + curve.getTotalLength();
	        cur = [parsed[i][5] + cur[0], parsed[i][6] + cur[1]];
	        functions.push(curve);
	      } else if(parsed[i][0] === "S"){
	        if(i>0 && ["C","c","S","s"].indexOf(parsed[i-1][0]) > -1){
	          curve = new Bezier(cur[0], cur[1] , cur[0] + parsed[i][1] - parsed[i][3], cur[1] + parsed[i][2] - parsed[i][4], parsed[i][1], parsed[i][2] , parsed[i][3], parsed[i][4]);
	        } else {
	          curve = new Bezier(cur[0], cur[1] , cur[0], cur[1], parsed[i][1], parsed[i][2] , parsed[i][3], parsed[i][4]);
	        }
	        length = length + curve.getTotalLength();
	        cur = [parsed[i][3], parsed[i][4]];
	        functions.push(curve);
	      }  else if(parsed[i][0] === "s"){
	        if(i>0 && ["C","c","S","s"].indexOf(parsed[i-1][0]) > -1){
	          curve = new Bezier(cur[0], cur[1] , cur[0] + parsed[i][1] - parsed[i][3], cur[1] + parsed[i][2] - parsed[i][4], cur[0] + parsed[i][1], cur[1] + parsed[i][2] , cur[0] + parsed[i][3], cur[1] + parsed[i][4]);
	        } else {
	          curve = new Bezier(cur[0], cur[1] , cur[0], cur[1], cur[0] + parsed[i][1], cur[1] + parsed[i][2] , cur[0] + parsed[i][3], cur[1] + parsed[i][4]);
	        }
	        length = length + curve.getTotalLength();
	        cur = [parsed[i][3] + cur[0], parsed[i][4] + cur[1]];
	        functions.push(curve);
	      }
	      //Quadratic Bezier curves
	      else if(parsed[i][0] === "Q"){
	        curve = new Bezier(cur[0], cur[1] , parsed[i][1], parsed[i][2] , parsed[i][3], parsed[i][4]);
	        length = length + curve.getTotalLength();
	        functions.push(curve);
	        cur = [parsed[i][3], parsed[i][4]];
	        prev_point = [parsed[i][1], parsed[i][2]];

	      }  else if(parsed[i][0] === "q"){
	        curve = new Bezier(cur[0], cur[1] , cur[0] + parsed[i][1], cur[1] + parsed[i][2] , cur[0] + parsed[i][3], cur[1] + parsed[i][4]);
	        length = length + curve.getTotalLength();
	        prev_point = [cur[0] + parsed[i][1], cur[1] + parsed[i][2]];
	        cur = [parsed[i][3] + cur[0], parsed[i][4] + cur[1]];
	        functions.push(curve);
	      } else if(parsed[i][0] === "T"){
	        if(i>0 && ["Q","q","T","t"].indexOf(parsed[i-1][0]) > -1){
	          curve = new Bezier(cur[0], cur[1] , 2 * cur[0] - prev_point[0] , 2 * cur[1] - prev_point[1] , parsed[i][1], parsed[i][2]);
	        } else {
	          curve = new LinearPosition(cur[0], parsed[i][1], cur[1], parsed[i][2]);
	        }
	        functions.push(curve);
	        length = length + curve.getTotalLength();
	        prev_point = [2 * cur[0] - prev_point[0] , 2 * cur[1] - prev_point[1]];
	        cur = [parsed[i][1], parsed[i][2]];

	      } else if(parsed[i][0] === "t"){
	        if(i>0 && ["Q","q","T","t"].indexOf(parsed[i-1][0]) > -1){
	          curve = new Bezier(cur[0], cur[1] , 2 * cur[0] - prev_point[0] , 2 * cur[1] - prev_point[1] , cur[0] + parsed[i][1], cur[1] + parsed[i][2]);
	        } else {
	          curve = new LinearPosition(cur[0], cur[0] + parsed[i][1], cur[1], cur[1] + parsed[i][2]);
	        }
	        length = length + curve.getTotalLength();
	        prev_point = [2 * cur[0] - prev_point[0] , 2 * cur[1] - prev_point[1]];
	        cur = [parsed[i][1] + cur[0], parsed[i][2] + cur[0]];
	        functions.push(curve);
	      }
	      partial_lengths.push(length);

	    }
	    return svgProperties;
	  }

	 svgProperties.getTotalLength = function(){
	    return length;
	  };

	  svgProperties.getPointAtLength = function(fractionLength){
	    if(fractionLength < 0){
	      fractionLength = 0;
	    } else if(fractionLength > length){
	      fractionLength = length;
	    }

	    var i = partial_lengths.length - 1;

	    while(partial_lengths[i] >= fractionLength && partial_lengths[i] > 0){
	      i--;
	    }
	    i++;
	    var fractionPart = fractionLength-partial_lengths[i-1];
	    return functions[i].getPointAtLength(fractionPart);
	  };

	  return svgProperties(svgString);
	}

	exports.svgPathProperties = pathProperties;
	exports.parse = parse;
	exports.Bezier = Bezier;

	Object.defineProperty(exports, '__esModule', { value: true });

}));